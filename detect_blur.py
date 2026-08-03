import cv2
import numpy as np
import json
import os

IMAGE_PATH = r"C:\Hexa-MedPlus\z-asset\image.png"
OUTPUT_PATH = r"C:\Hexa-MedPlus\report_blur_detected.jpg"

def detect_blurry_regions(image_path, patch_size=100, blur_threshold=75.0):
    print(f"[*] Loading image: {image_path}")
    image = cv2.imread(image_path)
    if image is None:
        print(f"[!] Error: Could not load image. Check the file path.")
        return

    # Convert to grayscale for mathematical analysis
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape
    
    print(f"[*] Image size: {width}x{height}")

    blurry_boxes = []

    # Slide a window across the image in a grid
    for y in range(0, height, patch_size):
        for x in range(0, width, patch_size):
            # Extract the patch
            patch = gray[y:y+patch_size, x:x+patch_size]
            
            # Skip edge patches that are smaller than the target size
            if patch.shape[0] < patch_size or patch.shape[1] < patch_size:
                continue
                
            # 1. Calculate Laplacian Variance (measures sharpness / edges)
            variance = cv2.Laplacian(patch, cv2.CV_64F).var()
            
            # 2. Calculate Standard Deviation (measures contrast / content presence)
            # A blank white piece of paper has ZERO variance, but it's not "blurry text".
            # It's just empty. We need to ensure there is actually some ink/content there.
            std_dev = np.std(patch)
            
            # If the patch has some content (std_dev > 10) but low sharpness (variance < threshold)
            if variance < blur_threshold and std_dev > 10:
                blurry_boxes.append([x, y, patch_size, patch_size])

    print(f"[*] Analyzed {(height // patch_size) * (width // patch_size)} patches.")
    
    # Merge overlapping/adjacent boxes using a binary mask and contours
    mask = np.zeros((height, width), dtype=np.uint8)
    for (bx, by, bw, bh) in blurry_boxes:
        # Fill the mask with white where blurry boxes are
        cv2.rectangle(mask, (bx, by), (bx+bw, by+bh), 255, -1) 
        
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    merged_boxes = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        merged_boxes.append((x, y, w, h))

    print(f"[*] Found {len(merged_boxes)} major blurry regions after merging.")

    final_boxes_json = []
    total_blurry_area = 0

    # Draw boxes on the image for visual verification
    for (x, y, w, h) in merged_boxes:
        total_blurry_area += (w * h)
        # Draw a thick Red rectangle (B, G, R) -> (0, 0, 255)
        cv2.rectangle(image, (x, y), (x+w, y+h), (0, 0, 255), 3)
        final_boxes_json.append({"x": int(x), "y": int(y), "w": int(w), "h": int(h)})
        
    total_image_area = width * height
    blurry_percentage = (total_blurry_area / total_image_area) * 100
    
    print(f"[*] TOTAL BLURRY AREA: {blurry_percentage:.2f}%")
    
    if blurry_percentage > 25.0:
        print("[!] WARNING: Document is heavily blurred! (>25% blurry). Do not send to Vision AI!")

    cv2.imwrite(OUTPUT_PATH, image)
    print(f"[*] Visual output saved to {OUTPUT_PATH}")

    # Save the coordinates to JSON (how the actual API would return them)
    with open("blur_coordinates.json", "w") as f:
        json.dump({
            "blurry_percentage": round(blurry_percentage, 2),
            "is_rejected": blurry_percentage > 25.0,
            "coordinates": final_boxes_json
        }, f, indent=4)
    print(f"[*] Exact coordinates saved to blur_coordinates.json")

if __name__ == "__main__":
    print(f"--- OpenCV Blur Detection ---")
    # You can tweak patch_size (size of the grid squares) 
    # and blur_threshold (how strict it is about sharpness)
    detect_blurry_regions(IMAGE_PATH, patch_size=100, blur_threshold=75.0)
