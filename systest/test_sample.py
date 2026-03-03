import unittest

class TestSample(unittest.TestCase):
    """샘플 테스트 케이스"""
    
    def test_addition(self):
        """덧셈 테스트"""
        self.assertEqual(1 + 2, 3)
        
    def test_subtraction(self):
        """뺄셈 테스트"""
        self.assertEqual(5 - 3, 2)
        
    def test_multiplication(self):
        """곱셈 테스트"""
        self.assertEqual(2 * 3, 6)
        
if __name__ == "__main__":
    unittest.main()