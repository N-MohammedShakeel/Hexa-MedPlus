import os

for r, d, files in os.walk('c:/Hexa-MedPlus/frontend/src'):
    for f in files:
        if f.endswith(('.js', '.jsx')):
            path = os.path.join(r, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            new_content = content.replace('import toast from "react-toastify"', 'import { toast } from "react-toastify"')
            new_content = new_content.replace('import { Toaster } from "react-toastify"', 'import { ToastContainer } from "react-toastify"')
            new_content = new_content.replace('<Toaster', '<ToastContainer')
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                print(f"Updated {path}")
