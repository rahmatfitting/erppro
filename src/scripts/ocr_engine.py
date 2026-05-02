import sys
import json
import re
import os

try:
    from PIL import Image
    import pytesseract
    from fuzzywuzzy import process
except ImportError:
    print(json.dumps({
        "success": False, 
        "error": "Python libraries missing. Please run: pip install pytesseract pillow fuzzywuzzy python-Levenshtein"
    }))
    sys.exit(1)

# Windows Tesseract Configuration
if sys.platform == "win32":
    # Common installation paths for Tesseract on Windows
    tesseract_paths = [
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'C:\Users\\' + os.getlogin() + r'\AppData\Local\Tesseract-OCR\tesseract.exe',
        r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe'
    ]
    for path in tesseract_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            break

def parse_po_text(text):
    """
    Simple rule-based parsing for PO documents.
    This can be improved with more complex regex or spaCy.
    """
    lines = text.split('\n')
    data = {
        "po_number": "",
        "date": "",
        "items": []
    }

    # Common regex patterns
    po_pattern = re.compile(r'(PO|Order|No|Nomor)\s*(Number|No)?[:.\s-]+([A-Z0-9/-]+)', re.IGNORECASE)
    date_pattern = re.compile(r'(\d{1,2}/\d{1,2}/\d{2,4}|\d{4}-\d{2}-\d{2})')

    for line in lines:
        line = line.strip()
        if not line: continue

        # Extract PO Number
        if not data["po_number"]:
            po_match = po_pattern.search(line)
            if po_match:
                data["po_number"] = po_match.group(3)

        # Extract Date
        if not data["date"]:
            date_match = date_pattern.search(line)
            if date_match:
                data["date"] = date_match.group(1)

        # Basic Item Table Detection (Look for lines with quantities and prices)
        # Pattern: [Name] [Qty] [Price]
        item_match = re.search(r'(.+?)\s+(\d+)\s+(PCS|UNIT|BOX|KG)?\s*(\d+[.,]\d+)', line, re.IGNORECASE)
        if item_match:
            data["items"].append({
                "name": item_match.group(1).strip(),
                "quantity": float(item_match.group(2)),
                "price": float(item_match.group(4).replace(',', ''))
            })

    return data

def match_items(extracted_items, master_barang):
    matched = []
    barang_names = [b['nama'] for b in master_barang]
    
    for item in extracted_items:
        # Fuzzy matching using Levenshtein distance
        match_result = process.extractOne(item['name'], barang_names, score_cutoff=70)
        
        if match_result:
            best_match_name = match_result[0]
            barang = next(b for b in master_barang if b['nama'] == best_match_name)
            matched.append({
                "kode_barang": barang['kode'],
                "nama_barang": barang['nama'],
                "satuan": barang['satuan'],
                "jumlah": item['quantity'],
                "harga": item['price'] or barang['harga_jual'],
                "subtotal": item['quantity'] * (item['price'] or barang['harga_jual']),
                "keterangan": f"OCR Python Match ({match_result[1]}%)"
            })
        else:
            matched.append({
                "kode_barang": "MANUAL",
                "nama_barang": item['name'],
                "satuan": "",
                "jumlah": item['quantity'],
                "harga": item['price'],
                "subtotal": item['quantity'] * item['price'],
                "keterangan": "OCR Python - No Match Found"
            })
    return matched

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: ocr_engine.py <image_path> <master_json>"}))
        sys.exit(1)

    image_path = sys.argv[1]
    master_json_path = sys.argv[2]

    try:
        # Load Master Barang
        with open(master_json_path, 'r') as f:
            master_barang = json.load(f)

        # Load and OCR Image
        if not os.path.exists(image_path):
            raise Exception(f"File not found: {image_path}")
            
        text = pytesseract.image_to_string(Image.open(image_path))
        
        # Parse extracted text
        parsed_data = parse_po_text(text)
        
        # Match Items
        matched_items = match_items(parsed_data['items'], master_barang)

        result = {
            "success": True,
            "data": {
                "po_number": parsed_data['po_number'],
                "date": parsed_data['date'],
                "items": matched_items
            }
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
