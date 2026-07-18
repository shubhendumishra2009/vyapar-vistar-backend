# Product Import Format Guide

This document describes the format for importing products via CSV, Excel, or JSON files.

## Supported File Formats

- **CSV** (.csv)
- **Excel** (.xlsx, .xls)
- **JSON** (.json)

## Required Fields

The following fields are **required** for each product:

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Product name (max 255 characters) |
| `sellingPrice` | Number | Selling price in ₹ (must be ≥ 0) |
| `purchasePrice` | Number | Purchase price in ₹ (must be ≥ 0) |

## Optional Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `description` | String | Product description | - |
| `sku` | String | Stock Keeping Unit (max 100 chars) | - |
| `barcode` | String | Barcode number (max 100 chars) | - |
| `category` | String | Product category (max 100 chars) | - |
| `brand` | String | Brand name (max 100 chars) | - |
| `unit` | String | Unit of measurement | `pieces` |
| `taxRate` | Number | Tax rate percentage (≥ 0) | `0` |
| `stock` | Number | Current stock quantity (≥ 0) | `0` |
| `minStock` | Number | Minimum stock threshold (≥ 0) | `0` |
| `maxStock` | Number | Maximum stock capacity (≥ 0) | `100` |
| `isActive` | Boolean | Whether product is active | `true` |
| `productType` | String | Business type category | `general` |

## Valid Values

### Unit Values
- `pieces`
- `kg`
- `liters`
- `meters`
- `boxes`
- `bottles`

### Product Type Values
- `retail`
- `wholesale`
- `medicine`
- `hardware`
- `grocery`
- `restaurant`
- `electronics`
- `clothing`
- `general`
- `other`

## CSV Format Example

```csv
name,description,sku,barcode,category,brand,unit,purchasePrice,sellingPrice,taxRate,stock,minStock,maxStock,isActive,productType
"Wireless Mouse","Ergonomic wireless mouse","WM-001","1234567890","Electronics","TechBrand","pieces",500.00,899.00,12,50,10,200,true,electronics
"USB Cable","USB Type-C cable 2m","UC-002","1234567891","Accessories","TechBrand","pieces",150.00,299.00,12,100,20,500,true,electronics
"Laptop Stand","Adjustable aluminum stand","LS-003","1234567892","Accessories","TechBrand","pieces",800.00,1499.00,12,25,5,100,true,electronics
```

## Excel Format Example

| name | description | sku | barcode | category | brand | unit | purchasePrice | sellingPrice | taxRate | stock | minStock | maxStock | isActive | productType |
|------|-------------|-----|---------|----------|-------|------|---------------|--------------|---------|-------|----------|----------|----------|-------------|
| Wireless Mouse | Ergonomic wireless mouse | WM-001 | 1234567890 | Electronics | TechBrand | pieces | 500.00 | 899.00 | 12 | 50 | 10 | 200 | Yes | electronics |
| USB Cable | USB Type-C cable 2m | UC-002 | 1234567891 | Accessories | TechBrand | pieces | 150.00 | 299.00 | 12 | 100 | 20 | 500 | Yes | electronics |

## JSON Format Example

```json
{
  "products": [
    {
      "name": "Wireless Mouse",
      "description": "Ergonomic wireless mouse",
      "sku": "WM-001",
      "barcode": "1234567890",
      "category": "Electronics",
      "brand": "TechBrand",
      "unit": "pieces",
      "purchasePrice": 500.00,
      "sellingPrice": 899.00,
      "taxRate": 12,
      "stock": 50,
      "minStock": 10,
      "maxStock": 200,
      "isActive": true,
      "productType": "electronics"
    },
    {
      "name": "USB Cable",
      "description": "USB Type-C cable 2m",
      "sku": "UC-002",
      "barcode": "1234567891",
      "category": "Accessories",
      "brand": "TechBrand",
      "unit": "pieces",
      "purchasePrice": 150.00,
      "sellingPrice": 299.00,
      "taxRate": 12,
      "stock": 100,
      "minStock": 20,
      "maxStock": 500,
      "isActive": true,
      "productType": "electronics"
    }
  ]
}
```

## Validation Rules

1. **Product Name**: Required, must not be empty, max 255 characters
2. **Selling Price**: Required, must be a valid number ≥ 0
3. **Purchase Price**: Required, must be a valid number ≥ 0
4. **Stock**: Optional, must be a valid number ≥ 0 if provided
5. **Tax Rate**: Optional, must be a valid number ≥ 0 if provided
6. **Unit**: Must be one of the valid unit values (defaults to `pieces`)
7. **Product Type**: Must be one of the valid product type values (defaults to `general`)
8. **File Size**: Maximum 10MB
9. **File Type**: Only .csv, .xlsx, .xls, and .json files are accepted

## Tips

1. **Download Templates**: Use the template download buttons in the Import modal to get pre-formatted files
2. **Batch Size**: You can import up to 10MB of data in a single file (approximately 1000-5000 products depending on data)
3. **Error Handling**: If validation fails, the system will return detailed error messages indicating which rows have issues
4. **Partial Imports**: If some rows have errors, only valid products will be imported (error rows are skipped)
5. **Encoding**: Use UTF-8 encoding for CSV and JSON files to avoid character encoding issues

## Common Issues

### CSV Issues
- **Problem**: Fields with commas not importing correctly
- **Solution**: Wrap fields containing commas in double quotes (e.g., `"Product, with comma"`)

### Excel Issues
- **Problem**: Numbers being interpreted as text
- **Solution**: Ensure numeric columns are formatted as numbers in Excel, not text

### JSON Issues
- **Problem**: Import fails with parse error
- **Solution**: Validate JSON syntax using a JSON validator before importing

## Support

If you encounter issues with imports:
1. Check the error message for specific row numbers and validation errors
2. Verify all required fields are present
3. Ensure numeric fields contain valid numbers
4. Check file size is under 10MB
5. Ensure file format matches one of the supported types