import os

filepath = '/etc/nginx/sites-available/avn-academy-training'
if os.path.exists(filepath):
    content = open(filepath).read()
    target = 'location /assets/ {'
    replacement = '''location /uploads/ {
        alias /var/www/avn-academy-training/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        add_header X-Content-Type-Options "nosniff" always;
        access_log off;
    }

    location /assets/ {'''
    if target in content and 'location /uploads/ {' not in content:
        content = content.replace(target, replacement)
        open(filepath, 'w').write(content)
        print("Successfully patched Nginx config.")
    else:
        print("Nginx config already patched or target not found.")
else:
    print("Nginx config file not found.")
