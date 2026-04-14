# service/popup_service.py
"""
Handles all business logic related to popup management.
"""
import logging
from typing import List, Dict, Optional
from dao.popup_dao import PopupDao
from utils.datetime_utils import get_kst_now

class PopupService:
    """
    Manages business logic for popups, including fetching, creating,
    updating, and deleting popup data.
    """
    def __init__(self, db_connection):
        self.conn = db_connection
        self.popup_dao = PopupDao(db_connection)
        self.logger = logging.getLogger(self.__class__.__name__)

    def get_all_popups(self, include_inactive: bool = False) -> List[Dict]:
        """
        Fetches all popups from the database.
        
        Args:
            include_inactive: If True, include inactive popups as well.
        
        Returns:
            List of popup dictionaries.
        """
        try:
            self.logger.info(f"Service: Fetching all popups (include_inactive={include_inactive})")
            popups = self.popup_dao.get_all_popups(include_inactive)
            self.logger.info(f"Service: Fetched {len(popups)} popups successfully")
            return popups
        except Exception as e:
            self.logger.error(f"Service: Failed to fetch all popups: {e}", exc_info=True)
            raise

    def get_popup_by_id(self, popup_id: int) -> Optional[Dict]:
        """
        Fetches a single popup by its ID.
        
        Args:
            popup_id: The ID of the popup to retrieve.
        
        Returns:
            Popup dictionary if found, None otherwise.
        """
        try:
            self.logger.info(f"Service: Fetching popup with ID {popup_id}")
            popup = self.popup_dao.get_popup_by_id(popup_id)
            if popup:
                self.logger.info(f"Service: Popup {popup_id} found")
            else:
                self.logger.info(f"Service: Popup {popup_id} not found")
            return popup
        except Exception as e:
            self.logger.error(f"Service: Failed to fetch popup {popup_id}: {e}", exc_info=True)
            raise

    def get_active_popups(self) -> List[Dict]:
        """
        Fetches currently active popups that should be displayed.
        
        Returns:
            List of active popup dictionaries.
        """
        try:
            current_time = get_kst_now().strftime('%Y-%m-%d %H:%M:%S')
            self.logger.info(f"Service: Fetching active popups for time {current_time}")
            popups = self.popup_dao.get_active_popups(current_time)
            self.logger.info(f"Service: Fetched {len(popups)} active popups")
            return popups
        except Exception as e:
            self.logger.error(f"Service: Failed to fetch active popups: {e}", exc_info=True)
            raise

    def create_popup(self, data: Dict, user_id: str) -> int:
        """
        Creates a new popup.
        
        Args:
            data: Dictionary containing popup data.
                Required keys: TITL, CONT, START_DT, END_DT
            user_id: The ID of the user creating the popup.
        
        Returns:
            The ID of the newly created popup.
        """
        try:
            self.logger.info(f"Service: Creating new popup by user {user_id}")
            
            # Validate required fields
            required_fields = ['TITL', 'CONT', 'START_DT', 'END_DT']
            for field in required_fields:
                if field not in data or not data[field]:
                    raise ValueError(f"Required field '{field}' is missing or empty")
            
            # Add user_id as registrant
            data['REG_USER_ID'] = user_id
            
            popup_id = self.popup_dao.insert_popup(data)
            self.logger.info(f"Service: Popup created successfully with ID {popup_id}")
            return popup_id
        except Exception as e:
            self.logger.error(f"Service: Failed to create popup: {e}", exc_info=True)
            raise

    def update_popup(self, popup_id: int, data: Dict, user_id: str):
        """
        Updates an existing popup.
        
        Args:
            popup_id: The ID of the popup to update.
            data: Dictionary containing updated popup data.
            user_id: The ID of the user updating the popup.
        """
        try:
            self.logger.info(f"Service: Updating popup {popup_id} by user {user_id}")
            
            # Check if popup exists
            existing_popup = self.popup_dao.get_popup_by_id(popup_id)
            if not existing_popup:
                raise ValueError(f"Popup with ID {popup_id} not found")
            
            # Add user_id as updater
            data['UPD_USER_ID'] = user_id
            
            self.popup_dao.update_popup(popup_id, data)
            self.logger.info(f"Service: Popup {popup_id} updated successfully")
        except Exception as e:
            self.logger.error(f"Service: Failed to update popup {popup_id}: {e}", exc_info=True)
            raise

    def delete_popup(self, popup_id: int, user_id: str):
        """
        Deletes a popup (soft delete).
        
        Args:
            popup_id: The ID of the popup to delete.
            user_id: The ID of the user deleting the popup.
        """
        try:
            self.logger.info(f"Service: Deleting popup {popup_id} by user {user_id}")
            
            # Check if popup exists
            existing_popup = self.popup_dao.get_popup_by_id(popup_id)
            if not existing_popup:
                raise ValueError(f"Popup with ID {popup_id} not found")
            
            self.popup_dao.delete_popup(popup_id, user_id)
            self.logger.info(f"Service: Popup {popup_id} deleted successfully")
        except Exception as e:
            self.logger.error(f"Service: Failed to delete popup {popup_id}: {e}", exc_info=True)
            raise
