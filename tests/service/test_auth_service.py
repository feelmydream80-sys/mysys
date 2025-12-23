import pytest
from unittest.mock import MagicMock, patch
from service.auth_service import AuthService

@pytest.fixture
def auth_service():
    """AuthService에 대한 테스트 fixture를 생성하고, 의존성을 모의 처리합니다."""
    with patch('service.auth_service.UserMapper') as MockUserMapper:

        mock_conn = MagicMock()
        service = AuthService(mock_conn)
        service.user_mapper = MockUserMapper()
        yield service

def test_verify_user_success(auth_service):
    """verify_user 메서드가 올바른 사용자 정보를 반환하는지 테스트합니다."""
    user_id = 'testuser'
    password = 'password123'

    mock_user = {'user_id': user_id, 'user_pwd': 'hashed_password', 'acc_sts': 'APPROVED'}
    mock_permissions = ['dashboard', 'admin']

    auth_service.user_mapper.find_by_id.return_value = mock_user
    auth_service.user_mapper.find_user_permissions.return_value = mock_permissions

    with patch('service.auth_service.PasswordService.check_password', return_value=True) as mock_check:
        user_info, message = auth_service.verify_user(user_id, password)

        assert user_info['user_id'] == user_id
        assert user_info['permissions'] == mock_permissions
        assert message == "로그인 성공"
        auth_service.user_mapper.find_by_id.assert_called_once_with(user_id)
        mock_check.assert_called_once_with(password, 'hashed_password')

def test_verify_user_invalid_password(auth_service):
    """verify_user 메서드가 잘못된 비밀번호에 대해 실패하는지 테스트합니다."""
    user_id = 'testuser'
    password = 'wrongpassword'

    mock_user = {'user_id': user_id, 'user_pwd': 'hashed_password', 'acc_sts': 'APPROVED'}

    auth_service.user_mapper.find_by_id.return_value = mock_user

    with patch('service.auth_service.PasswordService.check_password', return_value=False) as mock_check:
        user_info, message = auth_service.verify_user(user_id, password)

        assert user_info is None
        assert message == "비밀번호가 일치하지 않습니다."
        mock_check.assert_called_once_with(password, 'hashed_password')

def test_change_password_success(auth_service):
    """change_password 메서드가 비밀번호를 성공적으로 변경하는지 테스트합니다."""
    user_id = 'testuser'
    current_password = 'oldpassword'
    new_password = 'newpassword123'

    mock_user = {'user_id': user_id, 'user_pwd': 'hashed_old_password'}

    auth_service.user_mapper.find_by_id.return_value = mock_user

    with patch('service.auth_service.PasswordService.check_password', return_value=True) as mock_check, \
         patch('service.auth_service.PasswordService.hash_password', return_value='hashed_new_password') as mock_hash:
        success, message = auth_service.change_password(user_id, current_password, new_password)

        assert success is True
        assert message == "비밀번호가 성공적으로 변경되었습니다."
        mock_check.assert_called_once_with(current_password, 'hashed_old_password')
        mock_hash.assert_called_once_with(new_password)
        auth_service.user_mapper.update_password.assert_called_once_with(user_id, 'hashed_new_password')

def test_change_password_wrong_current_password(auth_service):
    """change_password 메서드가 잘못된 현재 비밀번호에 대해 실패하는지 테스트합니다."""
    user_id = 'testuser'
    current_password = 'wrongpassword'
    new_password = 'newpassword123'

    mock_user = {'user_id': user_id, 'user_pwd': 'hashed_old_password'}

    auth_service.user_mapper.find_by_id.return_value = mock_user

    with patch('service.auth_service.PasswordService.check_password', return_value=False) as mock_check, \
         patch('service.auth_service.PasswordService.hash_password') as mock_hash:
        success, message = auth_service.change_password(user_id, current_password, new_password)

        assert success is False
        assert message == "현재 비밀번호가 일치하지 않습니다."
        mock_check.assert_called_once_with(current_password, 'hashed_old_password')
        mock_hash.assert_not_called()
        auth_service.user_mapper.update_password.assert_not_called()

def test_change_password_user_not_found(auth_service):
    """change_password 메서드가 존재하지 않는 사용자에 대해 실패하는지 테스트합니다."""
    user_id = 'nonexistent'
    current_password = 'password'
    new_password = 'newpassword123'

    auth_service.user_mapper.find_by_id.return_value = None

    with patch('service.auth_service.PasswordService.check_password') as mock_check, \
         patch('service.auth_service.PasswordService.hash_password') as mock_hash:
        success, message = auth_service.change_password(user_id, current_password, new_password)

        assert success is False
        assert message == "존재하지 않는 사용자입니다."
        mock_check.assert_not_called()
        mock_hash.assert_not_called()
        auth_service.user_mapper.update_password.assert_not_called()
