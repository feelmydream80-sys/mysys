import logging
from dao.grp_memo_dao import GrpMemoDao

class GrpMemoMapper:
    
    def __init__(self, db_connection):
        self.grp_memo_dao = GrpMemoDao(db_connection)
        self.logger = logging.getLogger(self.__class__.__name__)

    def get_memo(self, grp_id: str, depth: int, memo_date: str):
        return self.grp_memo_dao.get_memo(grp_id, depth, memo_date)

    def get_memos_by_group(self, grp_id: str):
        return self.grp_memo_dao.get_memos_by_group(grp_id)

    def insert_memo(self, grp_id: str, depth: int, memo_date: str, content: str, writer_id: str):
        return self.grp_memo_dao.insert_memo(grp_id, depth, memo_date, content, writer_id)

    def update_memo(self, grp_id: str, depth: int, memo_date: str, content: str, writer_id: str):
        return self.grp_memo_dao.update_memo(grp_id, depth, memo_date, content, writer_id)

    def delete_memo(self, grp_id: str, depth: int, memo_date: str):
        return self.grp_memo_dao.delete_memo(grp_id, depth, memo_date)

    def get_all_memos_with_dates(self, grp_ids: list, dates: list):
        return self.grp_memo_dao.get_all_memos_with_dates(grp_ids, dates)

    def save_memo(self, grp_id: str, depth: int, memo_date: str, content: str, user_id: str):
        existing = self.get_memo(grp_id, depth, memo_date)
        if existing:
            return self.update_memo(grp_id, depth, memo_date, content, user_id)
        else:
            return self.insert_memo(grp_id, depth, memo_date, content, user_id)