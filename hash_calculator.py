import hashlib
password = 'admin123'
hashed = hashlib.sha256(password.encode()).hexdigest()
print(f'Password: {password}')
print(f'SHA-256 Hash: {hashed}')
