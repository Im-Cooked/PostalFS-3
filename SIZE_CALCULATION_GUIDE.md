# Postal Delivery System - Automatic Size Calculation

## 📋 Overview

The Postal Delivery System now uses **automatic size calculation** based on parcel weight. Users only need to enter the weight, and the system automatically determines the appropriate size category.

---

## ✅ Implementation

### 1. Size Categories (by Weight)

```
0 – 1 kg       → S    (Small)
>1 – 5 kg      → M    (Medium)
>5 – 15 kg     → L    (Large)
>15 – 30 kg    → XL   (Extra Large)
>30 – 60 kg    → XXL  (2X Extra Large)
>60 – 100 kg   → XXXL (3X Extra Large)
```

### 2. Weight Validation

- Minimum: **0.1 kg** (must be greater than 0)
- Maximum: **100 kg**
- If weight is outside this range, an error is displayed

Error message: **"Weight must be between 0.1 and 100 kg"**

---

## 🔧 Backend Implementation

### Location: `controllers/parcelController.js`

#### Calculate Size Function

```javascript
function calculateSize(weight) {
  const w = parseFloat(weight);
  
  // Validate weight range
  if (isNaN(w) || w <= 0 || w > 100) {
    throw new Error("Weight must be between 0.1 and 100 kg");
  }

  // Size determination based on weight
  if (w <= 1) return "S";
  if (w <= 5) return "M";
  if (w <= 15) return "L";
  if (w <= 30) return "XL";
  if (w <= 60) return "XXL";
  return "XXXL";
}
```

#### Create Parcel Method (Updated)

```javascript
createParcel: (req, res) => {
  const sender_id = req.session.customer.id;
  const { receiver_name, receiver_phone, receiver_address, weight } = req.body;
  
  try {
    const w = parseFloat(weight) || 0;
    
    // Validate and calculate size automatically
    const size = calculateSize(w);  // ← Size calculated in backend
    
    const shipping_cost = calculateShippingCost(w);
    const tracking_number = generateTrackingNumber();
    
    Parcel.create({ 
      tracking_number, 
      sender_id, 
      receiver_name, 
      receiver_phone, 
      receiver_address, 
      weight: w, 
      size,  // Use calculated size, NOT from frontend
      shipping_cost, 
      status: 'Pending' 
    }, (err, parcel_id) => {
      if (err) {
        return res.render('create-parcel', { error: 'Failed to create parcel: ' + err.message });
      }
      res.redirect('/parcels/' + parcel_id);
    });
  } catch (err) {
    return res.render('create-parcel', { error: err.message });
  }
}
```

### Key Points:
✅ **Backend Calculation Only** - Size is NEVER sent from frontend  
✅ **Weight Validation** - Error thrown if weight is invalid  
✅ **Try-Catch Pattern** - Proper error handling  
✅ **Secure** - Frontend cannot manipulate size values  

---

## 📝 Frontend Implementation

### Location: `views/create-parcel.ejs`

#### Form Input

```html
<label>Weight (kg)</label>
<input type="number"
       name="weight"
       min="0.1"
       max="100"
       step="0.1"
       placeholder="Enter weight between 0.1 - 100 kg"
       required />

<p style="font-size: 0.9rem; color: #64748B; margin-top: 5px;">
  ℹ️ Size will be automatically determined based on weight:
  <br>0-1kg (S) | 1-5kg (M) | 5-15kg (L) | 15-30kg (XL) | 30-60kg (XXL) | 60-100kg (XXXL)
</p>
```

### Key Features:
- ✅ Number input with min/max bounds
- ✅ Step value of 0.1 for precise weight
- ✅ Helpful placeholder text
- ✅ Size categories displayed as reference
- ✅ No size input field (automatic calculation)

---

## 📊 Parcel Detail Display

### Location: `views/tracking.ejs`

#### Size Display with Color-Coded Badges

```html
<div class="parcel-specs">
  <p><strong>Weight:</strong> <span class="spec-value"><%= parcel.weight %> kg</span></p>
  <p><strong>Size:</strong> <span class="size-badge size-<%= parcel.size.toLowerCase() %>"><%= parcel.size %></span></p>
</div>
```

#### Size Badge Colors

```
S    → Green (#D1FAE5)
M    → Light Blue (#DBEAFE)
L    → Blue (#BFDBFE)
XL   → Cyan (#CFFAFE)
XXL  → Yellow (#FCD34D)
XXXL → Pink (#FBCFE8)
```

---

## 🔒 Security Features

### 1. No Frontend Manipulation
- Size input field **removed** from form
- Size is **calculated in backend** only
- Frontend cannot send custom size values

### 2. Weight Validation
```javascript
if (isNaN(w) || w <= 0 || w > 100) {
  throw new Error("Weight must be between 0.1 and 100 kg");
}
```

### 3. Consistent Size Assignment
- Same weight always produces same size
- Database stores calculated size
- No manual overrides possible

---

## 📋 Example Workflow

### Step 1: User Creates Parcel
```
Form Input:
- Receiver Name: John Doe
- Receiver Phone: +66 XX-XXX-XXXX
- Weight: 8.5 kg    ← User enters weight
- Size: (NOT SHOWN) ← No input field
```

### Step 2: Backend Processing
```javascript
weight = 8.5
size = calculateSize(8.5)  // Returns "M" (>5-15kg range)
shipping_cost = 30 + (20 * 8.5) = 200 baht
```

### Step 3: Display in Parcel Details
```
Parcel Details:
Tracking Number: PD-ABC123-4567
Receiver: John Doe (+66 XX-XXX-XXXX)
Weight: 8.5 kg
Size: [M]  ← Color-coded badge
Shipping Cost: ฿200
Status: Pending
```

---

## 🧪 Testing Examples

### Valid Inputs
```
0.5 kg  → Size S
1.0 kg  → Size S
1.5 kg  → Size M
5.0 kg  → Size M
10.0 kg → Size L
20.0 kg → Size XL
45.0 kg → Size XXL
80.0 kg → Size XXXL
```

### Invalid Inputs
```
0 kg      → Error: "Weight must be between 0.1 and 100 kg"
-5 kg     → Error: "Weight must be between 0.1 and 100 kg"
101 kg    → Error: "Weight must be between 0.1 and 100 kg"
abc kg    → Error: "Weight must be between 0.1 and 100 kg"
```

---

## 🎯 Benefits

1. **Automation** - No manual size entry needed
2. **Consistency** - Same weight always gets same size
3. **Security** - Backend control prevents manipulation
4. **User Experience** - Simpler form with helpful info
5. **Data Integrity** - Reliable size calculations
6. **Scalability** - Easy to adjust size rules in one place

---

## 📦 Code Files Modified

1. **controllers/parcelController.js**
   - Added `calculateSize()` function
   - Updated `createParcel()` method
   - Exported `calculateSize` for future use

2. **views/create-parcel.ejs**
   - Removed size input field
   - Updated weight input validation
   - Added size category reference
   - Improved styling

3. **views/tracking.ejs**
   - Added size display with badge
   - Color-coded size categories
   - Improved parcel details layout
   - Enhanced styling

---

## 🚀 Usage Instructions

### For Users
1. Go to "Create Parcel"
2. Fill in receiver details
3. **Enter weight (0.1 - 100 kg)** ← Only this matters
4. Click "Create Parcel"
5. System automatically shows calculated size

### For Developers
To use the calculateSize function in other parts of the code:

```javascript
const { parcelController, calculateSize } = require('./controllers/parcelController');

// Example usage
try {
  const size = calculateSize(15);  // Returns "L"
  console.log(`Size for 15kg: ${size}`);
} catch (err) {
  console.log(`Error: ${err.message}`);
}
```

---

## 🔄 Future Enhancements

Possible improvements:
- Dynamic size ranges based on shipping rates
- Different sizes for different shipping methods
- Volume-based size calculation (weight + dimensions)
- Admin panel to adjust size thresholds
- Size-based handling recommendations

---

## ✨ Summary

Your Postal Delivery System now features:
- ✅ Automatic size calculation based on weight
- ✅ Simplified parcel creation form
- ✅ Secure backend-only size determination
- ✅ Color-coded size badges in parcel details
- ✅ Comprehensive weight validation
- ✅ Professional user experience
- ✅ Data integrity and consistency

Enjoy your enhanced parcel management system! 🎉
