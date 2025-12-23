# service/auth_service.py
from mapper.user_mapper import UserMapper
from service.password_service import PasswordService

class AuthService:
    def __init__(self, db_connection):
        self.conn = db_connection
        self.user_mapper = UserMapper(db_connection)

    def get_user_by_id(self, user_id):
        """ID로 사용자 정보를 조회합니다."""
        user = self.user_mapper.find_by_id(user_id)
        if not user:
            return None

        permissions = self.user_mapper.find_user_permissions(user_id)
        user_info = {
            "user_id": user.get('user_id'),
            "permissions": permissions
        }
        return user_info

    def verify_user(self, user_id, password):
        """
        사용자 ID와 비밀번호를 검증합니다.
        인증 성공 시 사용자 정보와 권한 정보를 반환합니다.
        """
        user = self.user_mapper.find_by_id(user_id)

        if not user:
            return None, "존재하지 않는 사용자입니다."
        
        if user.get('acc_sts') != 'APPROVED':
            return None, "승인되지 않은 사용자입니다."

        if password is not None and not PasswordService.check_password(password, user.get('user_pwd')):
            return None, "비밀번호가 일치하지 않습니다."

        permissions = self.user_mapper.find_user_permissions(user_id)
        
        user_info = {
            "user_id": user.get('user_id'),
            "permissions": permissions
        }
        
        return user_info, "로그인 성공"

    def change_password(self, user_id, current_password, new_password):
        """
        사용자의 비밀번호를 변경합니다.
        현재 비밀번호를 확인한 후 새 비밀번호로 변경합니다.
        """
        user = self.user_mapper.find_by_id(user_id)

        if not user:
            return False, "존재하지 않는 사용자입니다."

        # 현재 비밀번호 확인
        if not PasswordService.check_password(current_password, user.get('user_pwd')):
            return False, "현재 비밀번호가 일치하지 않습니다."

        # 새 비밀번호 해시화 및 업데이트
        hashed_new_password = PasswordService.hash_password(new_password)
        self.user_mapper.update_password(user_id, hashed_new_password)

        return True, "비밀번호가 성공적으로 변경되었습니다."
