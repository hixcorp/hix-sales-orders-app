// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{thread::sleep, time::Duration};

use serde_json::Value;
use tauri::{api::process::Command, utils::assets::EmbeddedAssets, Context, Manager, WindowEvent, WindowUrl};

fn main() {
  
    let port = 8000;
    /// In production we will be using the tauri window to handle authentication
    /// We use the localhost plugin to expose the tauri window in an http context
    /// The python server handles the authentication workflow
    use tauri::WindowUrl;
    use tauri::utils::config::AppUrl;
    let mut context = tauri::generate_context!();
    let url = format!("http://localhost:{}", port).parse().unwrap();
    let window_url = WindowUrl::External(url);
    context.config_mut().build.dist_dir = AppUrl::Url(window_url.clone());
    println!("{}",&window_url);
  

    let builder = tauri::Builder::default();

    #[cfg(feature="custom-protocol")]
    let builder = builder.plugin(tauri_plugin_localhost::Builder::new(port).build());

    builder.plugin(tauri_plugin_websocket::init())
        .setup(move |app| {
            let app_handle = app.handle();
            let splash_screen_handle = app_handle.clone();
            let splash_screen = app.get_window("splashscreen").unwrap();
            splash_screen.set_focus().unwrap();
            // Wait for python server to start and then show the main window:
            tauri::async_runtime::spawn(async move {
            
                #[cfg(feature="custom-protocol")]
                let _ = async_start_python_server().await.unwrap();
                
                #[cfg(not(feature="custom-protocol"))]
                let _ = get_pids().await;
                
                if let Some(main_window) = app_handle.get_window("main") {
                    main_window.eval("location.reload();").unwrap();
                    main_window.show().unwrap();
                    main_window.set_focus().unwrap();
                }
                
                if let Some(splash_screen) = splash_screen_handle.get_window("splashscreen") {
                    splash_screen.close().unwrap();
                }

            });
            
            let app_handle = app.handle();
            let main_window = app.get_window("main").unwrap();
            main_window.on_window_event(move |event| match event {
                WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    
                    // Clone the handle inside the closure for use in the async context
                    let handle = app_handle.clone();
                    tauri::async_runtime::spawn(async move {
                        
                        #[cfg(feature="custom-protocol")]
                        shutdown_python_server().await;

                        // After the server shutdown, close the window
                        if let Some(window) = handle.get_window("main") {
                            window.close().expect("failed to close window");
                        }
                    });
                },
                _ => {}
            }
            );

                Ok(())
            })
            .invoke_handler(tauri::generate_handler![start_python_server,shutdown_python_server,zoom_window])
            .run(tauri::generate_context!())
        
        .expect("error while running tauri application");
}


#[tauri::command]
fn start_python_server() -> Result<u32,String>{
    // `new_sidecar()` expects just the filename, NOT the whole path like in JavaScript
  let (_rx,child) = Command::new_sidecar("main")
    .expect("failed to create `main` python server binary command")
    .spawn()
    .expect("Failed to spawn sidecar");

  let pid = child.pid();

  println!("{:?}",&pid);
  Ok(pid)
}

#[allow(dead_code)]
async fn async_start_python_server() -> Result<u32, String> {
    // `new_sidecar()` expects just the filename, NOT the whole path like in JavaScript
    let (_rx, _child) = Command::new_sidecar("main")
        .expect("failed to create `main` python server binary command")
        .spawn()
        .expect("Failed to spawn sidecar");

    // let pid = child.pid();
    get_pids().await

}

#[tauri::command]
async fn close_python_server(pid: u32) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let command = format!("taskkill /PID {} /F", pid);
    #[cfg(not(target_os = "windows"))]
    let command = format!("kill -9 {}", pid);

    #[cfg(target_os = "windows")]
    let output = std::process::Command::new("cmd")
        .args(["/C", &command])
        .output()
        .map_err(|e| e.to_string())?;

    #[cfg(not(target_os = "windows"))]
    let output = std::process::Command::new("sh")
        .arg("-c")
        .arg(&command)
        .output()
        .map_err(|e| e.to_string())?;

    println!("Attempted to shut down python server with result: {:?}", output);
    if output.status.success() {
        Ok(())
    } else {
        Err(format!("Failed to execute command: {:?}", output))
    }
}

async fn get_pids() -> Result<u32,String> {
    let client = reqwest::Client::new();
    let mut pid_response: Result<u32,String> = Err("".to_string());

    println!("PID: {:?}",&pid_response);
    while pid_response.is_err() {
        println!("WAITING FOR PID");
        let pid = client
            .get("http://127.0.0.1:3000/process_id")
            .send()
            .await
            .map_err(|e| e.to_string());
        
        pid_response = match pid {
            Ok(pid) => {
                    let pid = pid.json::<Value>().await.map_err(|e| e.to_string())?;
                    let pid = pid["pid"].as_str()
                    .ok_or("Failed to parse PID")?
                    .parse::<u32>()
                    .map_err(|e| e.to_string());
                    pid
            },
            Err(err) =>{
                println!("Failed to fetch PID. Retrying...");
                sleep(Duration::from_secs(1)); // Adding a delay between attempts
                Err(err)
            },
        };

    }

    println!("PID: {:?}",&pid_response);
    pid_response
}


#[tauri::command]
async fn shutdown_python_server() {
    match get_pids().await {
        Ok(pid) => {
            match close_python_server(pid).await {
              Ok(()) => println!("Successfully shut down PID {:?}", pid),
              Err(output) => println!("Attempted to shut down python server with result: {:?}", output)
            };
        },
        Err(e) => println!("Failed to get PID: {}", e)
    };
}

// #[tauri::command]
// fn select_directory(window: tauri::Window) -> Result<String, String> {
//     tauri::api::dialog::blocking::open_directory(&window, None, None)
//         .map(|path| path.to_string_lossy().into_owned())
//         .map_err(|_| "Failed to open directory".to_string())
// }

#[tauri::command]
fn zoom_window(window: tauri::Window, scale_factor: f64) {
    let _ = window.with_webview(move |webview| {
        #[cfg(target_os = "linux")]
        {
          // see https://docs.rs/webkit2gtk/0.18.2/webkit2gtk/struct.WebView.html
          // and https://docs.rs/webkit2gtk/0.18.2/webkit2gtk/trait.WebViewExt.html
          use webkit2gtk::traits::WebViewExt;
          webview.inner().set_zoom_level(scale_factor);
        }

        #[cfg(windows)]
        unsafe {
          // see https://docs.rs/webview2-com/0.19.1/webview2_com/Microsoft/Web/WebView2/Win32/struct.ICoreWebView2Controller.html
          webview.controller().SetZoomFactor(scale_factor).unwrap();
        }

        #[cfg(target_os = "macos")]
        unsafe {
          let () = msg_send![webview.inner(), setPageZoom: scale_factor];
        }
      });
}