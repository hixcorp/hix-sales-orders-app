// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{api::process::{Command, CommandEvent}, Manager, WindowEvent};

fn main() {
  
  tauri::Builder::default()
    .setup(|app| {
            // Start the python server on startup
            let _pid1 = start_python_server(app.get_window("main").unwrap()).unwrap();

            let app_handle = app.handle();
            let main_window = app.get_window("main").unwrap();
            main_window.on_window_event(move |event| match event {
                WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    
                     // Clone the handle inside the closure for use in the async context
                    let handle = app_handle.clone();
                    tauri::async_runtime::spawn(async move {
                        // shutdown_python_server().await;
                        
                        // let close_python = close_python_server(_pid1).await;
                        // match close_python {
                        //   Ok(()) => println!("Python server process closed successfully"),
                        //   err => println!("Python server process did not close successfully {:?}", err)
                        // }
                        // After the server shutdown, close the window
                        if let Some(window) = handle.get_window("main") {
                            window.close().expect("failed to close window");
                        }
                    });
                },
                _ => {}
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![start_python_server,close_python_server])
        .run(tauri::generate_context!())
    
    .expect("error while running tauri application");
}

#[tauri::command]
fn start_python_server(window: tauri::Window) -> Result<u32,String>{
    // `new_sidecar()` expects just the filename, NOT the whole path like in JavaScript
  let (mut rx, mut child) = Command::new_sidecar("main")
    .expect("failed to create `my-sidecar` binary command")
    .spawn()
    .expect("Failed to spawn sidecar");

  let pid = child.pid();//.expect("Failed to get python server process id");

  tauri::async_runtime::spawn(async move {
    // read events such as stdout
    while let Some(event) = rx.recv().await {
      if let CommandEvent::Stdout(line) = event {
        println!("{}",line);
        window
          .emit("message", Some(format!("'{}'", line)))
          .expect("failed to emit event");
        // write to stdin
        child.write("message from Rust\n".as_bytes()).unwrap();
      }
    }
  });
  println!("{:?}",&pid);
  Ok(pid)
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
  // Fetch the PID from the Python server
  let pid_response = client.get("http://127.0.0.1:8000/process_id")
      .send()
      .await
      .map_err(|e| e.to_string())?
      .json::<serde_json::Value>()
      .await
      .map_err(|e| e.to_string())?;

  let pid = pid_response["pid"].as_str()
      .ok_or("Failed to parse PID")?
      .parse::<u32>()
      .map_err(|e| e.to_string())?;

  Ok(pid)
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
