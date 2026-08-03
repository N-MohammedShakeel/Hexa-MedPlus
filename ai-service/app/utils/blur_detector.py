import cv2
import numpy as np
from app.utils.logger import log_info, log_error

def check_image_blur(image_bytes, patch_size=100, blur_threshold=75.0):
    """
    Returns the blurry percentage of an image. If > 25.0, it is considered too blurry.
    """
    try:
        # Convert bytes to numpy array then to cv2 image
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            log_error("check_image_blur: Could not decode image bytes.")
            return 0.0, [], 0, 0

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        height, width = gray.shape
        
        blurry_boxes = []

        # Slide a window across the image in a grid
        for y in range(0, height, patch_size):
            for x in range(0, width, patch_size):
                patch = gray[y:y+patch_size, x:x+patch_size]
                
                if patch.shape[0] < patch_size or patch.shape[1] < patch_size:
                    continue
                    
                variance = cv2.Laplacian(patch, cv2.CV_64F).var()
                std_dev = np.std(patch)
                
                if variance < blur_threshold and std_dev > 10:
                    blurry_boxes.append([x, y, patch_size, patch_size])

        mask = np.zeros((height, width), dtype=np.uint8)
        for (bx, by, bw, bh) in blurry_boxes:
            cv2.rectangle(mask, (bx, by), (bx+bw, by+bh), 255, -1) 
            
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        total_blurry_area = 0
        merged_boxes = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            total_blurry_area += (w * h)
            merged_boxes.append({"x": x, "y": y, "w": w, "h": h})

        total_image_area = width * height
        if total_image_area == 0:
            return 0.0, [], 0, 0

        blurry_percentage = (total_blurry_area / total_image_area) * 100
        log_info(f"check_image_blur: Evaluated image as {blurry_percentage:.2f}% blurry. Size: {width}x{height}")
        
        return blurry_percentage, merged_boxes, width, height

    except Exception as e:
        log_error(f"check_image_blur: Failed to process image: {str(e)}")
        return 0.0, [], 0, 0
