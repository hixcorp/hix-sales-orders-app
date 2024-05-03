from sqlalchemy import Column, String, Boolean

from db_management import Base

class ItemSettings(Base):
    __tablename__ = 'item_settings'
    column_name = Column(String, primary_key=True)
    hidden = Column(Boolean, default=False, nullable=False)
    display_name = Column(String, default="")

    def __init__(self, column_name, hidden=False, display_name=None):
        self.column_name = column_name
        self.hidden = hidden
        self.display_name = display_name if display_name else column_name
