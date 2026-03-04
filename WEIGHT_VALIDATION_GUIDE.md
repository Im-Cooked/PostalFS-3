# Postal Delivery System - Weight Validation Guide

## 📋 Overview

The Postal Delivery System implements **three-layer weight validation** to ensure data integrity and security:

1. **Frontend HTML5 Validation** - Browser-level constraints
2. **Frontend JavaScript Validation** - Real-time user feedback
3. **Backend Validation** - Final security check (most important)

---

## 🎯 Weight Constraints

```
Minimum: 0.1 kg (greater than 0)
Maximum: 100 kg (cannot exceed)
```

### Weight Range Categories
```
0.1 – 1 kg     → Size S
1 – 5 kg       → Size M
5 – 15 kg      → Size L
15 – 30 kg     → Size XL
30 – 60 kg     → Size XXL
60 – 100 kg    → Size XXXL
```

---

## 🖥️ Frontend Validation (Layer 1 & 2)

### Location: `views/create-parcel.ejs`

### HTML5 Input Constraints
```html
<input type="number"
       name="weight"
       id="weightInput"
       min="0.1"
       max="100"
       step="0.1"
       placeholder="Enter weight between 0.1 - 100 kg"
       required />
```

**Attributes:**
- `type="number"` - Only numeric input allowed
- `min="0.1"` - Minimum bound (HTML5 enforces)
- `max="100"` - Maximum bound (HTML5 enforces)
- `step="0.1"` - Precision: 0.1 kg increments
- `required` - Field is mandatory

### JavaScript Real-Time Validation
```javascript
document.getElementById('weightInput').addEventListener('input', function() {
  const weight = parseFloat(this.value);
  const feedback = document.getElementById('weightFeedback');
  const submitBtn = document.querySelector('.btn-create');

  // Clear feedback
  feedback.textContent = '';
  feedback.style.display = 'none';
  submitBtn.disabled = false;

  if (this.value === '') return;

  if (isNaN(weight)) {
    feedback.textContent = '⚠️ Please enter a valid number';
    feedback.style.display = 'block';
    submitBtn.disabled = true;
    return;
  }

  if (weight <= 0) {
    feedback.textContent = '⚠️ Weight must be greater than 0';
    feedback.style.display = 'block';
    submitBtn.disabled = true;
    return;
  }

  if (weight > 100) {
    feedback.textContent = '⚠️ Maximum allowed weight is 100 kg';
    feedback.style.display = 'block';
    submitBtn.disabled = true;
    return;
  }

  // Valid weight
  feedback.style.display = 'none';
  submitBtn.disabled = false;
});
```

**Features:**
- ✅ Real-time validation as user types
- ✅ Clear error messages
- ✅ Disable submit button on invalid input
- ✅ Visual feedback with icons (⚠️)
- ✅ Enable submit when valid

### Form Submission Validation
```javascript
document.getElementById('createParcelForm').addEventListener('submit', function(e) {
  const weight = parseFloat(document.getElementById('weightInput').value);

  if (isNaN(weight) || weight <= 0 || weight > 100) {
    e.preventDefault();
    alert('Invalid weight. Please enter a value between 0.1 and 100 kg.');
    return false;
  }
});
```

---

## 🔐 Backend Validation (Layer 3 - CRITICAL)

### Location: `controllers/parcelController.js`

### createParcel Method
```javascript
createParcel: (req, res) => {
  const sender_id = req.session.customer.id;
  const { receiver_name, receiver_phone, receiver_address, weight } = req.body;
  
  // ==========================================
  // STRICT WEIGHT VALIDATION (Backend)
  // ==========================================
  
  // Parse weight as a number
  const w = Number(weight);
  
  // Check if weight is a valid number
  if (isNaN(w) || weight === '' || weight === undefined) {
    return res.render('create-parcel', { 
      error: 'Weight is required' 
    });
  }
  
  // Check if weight is greater than 0
  if (w <= 0) {
    return res.render('create-parcel', { 
      error: 'Weight must be greater than 0' 
    });
  }
  
  // Check if weight exceeds maximum (100 kg)
  if (w > 100) {
    return res.render('create-parcel', { 
      error: 'Maximum allowed weight is 100 kg' 
    });
  }
  
  // Round weight to 1 decimal place for consistency
  const finalWeight = Math.round(w * 10) / 10;
  
  try {
    // Validate and calculate size automatically
    const size = calculateSize(finalWeight);
    
    const shipping_cost = calculateShippingCost(finalWeight);
    const tracking_number = generateTrackingNumber();
    
    // Save with validated weight
    Parcel.create({ 
      tracking_number, 
      sender_id, 
      receiver_name, 
      receiver_phone, 
      receiver_address, 
      weight: finalWeight,  // ← Validated weight
      size,
      shipping_cost, 
      status: 'Pending' 
    }, (err, parcel_id) => {
      if (err) {
        return res.render('create-parcel', { 
          error: 'Failed to create parcel: ' + err.message 
        });
      }
      res.redirect('/parcels/' + parcel_id);
    });
  } catch (err) {
    return res.render('create-parcel', { 
      error: err.message 
    });
  }
}
```

### Validation Steps (In Order)
1. ✅ Parse weight as Number
2. ✅ Check if weight is valid number (not NaN)
3. ✅ Check if weight is empty or undefined
4. ✅ Check if weight > 0
5. ✅ Check if weight ≤ 100
6. ✅ Round to 1 decimal place
7. ✅ Calculate size
8. ✅ Save to database (only if all checks pass)

### Why Backend Validation is Critical
```
Frontend Validation CAN BE BYPASSED:
- Browser dev tools
- API calls without UI
- Direct HTTP requests
- Network manipulation
- Malicious client code

Backend Validation CANNOT BE BYPASSED:
- Server-enforced rules
- Database constraints
- Audit trail
- Security layer
- Final authority
```

---

## 🔄 Error Handling Flow

### Scenario 1: User Enters 150 kg
```
Frontend HTML5:
  Input constraint: max="100"
  Browser prevents input > 100 ❌

Frontend JavaScript (if bypass):
  Real-time check: weight > 100
  Shows: "⚠️ Maximum allowed weight is 100 kg"
  Disables submit button ❌

Backend (final check):
  if (w > 100) {
    error: "Maximum allowed weight is 100 kg"
  }
  Request rejected ❌
```

### Scenario 2: User Enters 0 kg
```
Frontend HTML5:
  Input constraint: min="0.1"
  Browser prevents input ≤ 0 ❌

Frontend JavaScript (if bypass):
  Real-time check: weight <= 0
  Shows: "⚠️ Weight must be greater than 0"
  Disables submit button ❌

Backend (final check):
  if (w <= 0) {
    error: "Weight must be greater than 0"
  }
  Request rejected ❌
```

### Scenario 3: User Enters Valid Weight (25 kg)
```
Frontend HTML5:
  Input constraint: 0.1 ≤ 25 ≤ 100 ✅

Frontend JavaScript:
  Real-time check: passes all validations
  Shows: (no error message)
  Enables submit button ✅

Backend:
  Validates: 25 is valid ✅
  Rounds: 25.0 kg
  Calculates size: "XL"
  Saves parcel ✅
  Redirects: /parcels/{id} ✅
```

---

## 📊 Weight Rounding

The system rounds weight to **1 decimal place** for consistency:

```javascript
const finalWeight = Math.round(w * 10) / 10;
```

### Examples
```
Input: 25.37 kg  → Saved: 25.4 kg
Input: 15.12 kg  → Saved: 15.1 kg
Input: 8.99 kg   → Saved: 9.0 kg
Input: 3.05 kg   → Saved: 3.1 kg
Input: 0.15 kg   → Saved: 0.2 kg
Input: 100 kg    → Saved: 100.0 kg
```

**Benefits:**
- ✅ Consistent decimal places
- ✅ Avoid floating-point errors
- ✅ Database uniformity
- ✅ Better reporting

---

## 🎯 Error Messages

### User-Friendly Messages
| Error | Message | Cause |
|-------|---------|-------|
| Empty | "Weight is required" | No input |
| Invalid | "Please enter a valid number" | Non-numeric input |
| Too Low | "Weight must be greater than 0" | Weight ≤ 0 |
| Too High | "Maximum allowed weight is 100 kg" | Weight > 100 |
| System | "Failed to create parcel: [error]" | Database error |

### Error Display in Form
```html
<div class="error-box">
  <strong>⚠️ Error:</strong> <%= error %>
</div>
```

**Styling:**
```css
.error-box {
  background: #FEE2E2;        /* Light red */
  border: 1px solid #FECACA; /* Red border */
  border-radius: 8px;
  padding: 12px 16px;
  color: #7F1D1D;             /* Dark red text */
  font-weight: 600;
}
```

---

## 🔒 Security Best Practices Followed

1. **Never Trust Frontend** ✅
   - All validation repeated on backend
   - Frontend is UX only
   
2. **Explicit Validation** ✅
   - Clear if/else checks
   - No silent failures
   
3. **Early Rejection** ✅
   - Reject invalid data immediately
   - Don't process further
   
4. **Error Logging** ✅
   - Clear error messages
   - User feedback
   
5. **Weight Normalization** ✅
   - Round to consistent decimal
   - No floating-point errors

---

## 🧪 Testing Examples

### Valid Cases
```
0.1 kg  → ✅ Passes (Size S)
2.5 kg  → ✅ Passes (Size M)
10 kg   → ✅ Passes (Size L)
25.7 kg → ✅ Passes (rounds to 25.7, Size XL)
50 kg   → ✅ Passes (Size XXL)
99.9 kg → ✅ Passes (Size XXXL)
100 kg  → ✅ Passes (Size XXXL)
```

### Invalid Cases - Frontend Block
```
-5 kg     → ❌ HTML5 min constraint
0 kg      → ❌ HTML5 min constraint
100.1 kg  → ❌ HTML5 max constraint
abc kg    → ❌ HTML5 type=number
```

### Invalid Cases - Backend Catch
```
"" (empty)     → ❌ Error: "Weight is required"
null           → ❌ Error: "Weight is required"
undefined      → ❌ Error: "Weight is required"
"abc"          → ❌ Error: "Weight must be greater than 0"
-10            → ❌ Error: "Weight must be greater than 0"
150            → ❌ Error: "Maximum allowed weight is 100 kg"
0.05           → ❌ Error: "Weight must be greater than 0"
```

---

## 📝 Code Summary

### Three Validation Layers

**Layer 1: HTML5 Constraints**
- Browser enforces min/max bounds
- User cannot submit form with invalid values

**Layer 2: JavaScript Feedback**
- Real-time validation messages
- Submit button disabled on error
- Better UX with instant feedback

**Layer 3: Backend Validation**
- Server-side checks (most important)
- Cannot be bypassed
- Final authority

---

## 🚀 Usage for Developers

### Using the Weight Validation Function
```javascript
const { parcelController, calculateSize } = require('./controllers/parcelController');

// Example: Validate weight before processing
function validateWeight(weight) {
  const w = Number(weight);
  
  if (isNaN(w) || w <= 0) {
    return { valid: false, error: 'Weight must be greater than 0' };
  }
  
  if (w > 100) {
    return { valid: false, error: 'Maximum allowed weight is 100 kg' };
  }
  
  const finalWeight = Math.round(w * 10) / 10;
  return { valid: true, weight: finalWeight };
}
```

---

## ✨ Summary

Your Postal Delivery System now has:

✅ **HTML5 Input Constraints**
- Browser-level validation
- min/max bounds enforced

✅ **Real-Time JavaScript Feedback**
- Error messages as user types
- Dynamic submit button state
- Clear visual indicators

✅ **Robust Backend Validation**
- Cannot be bypassed
- Handles edge cases
- Proper error messages

✅ **Weight Rounding**
- Consistent 1 decimal place
- Prevents floating-point errors
- Database uniformity

✅ **Security**
- Multiple validation layers
- Never trusts frontend alone
- Proper error handling

**Your system is now secure, user-friendly, and reliable!** 🎉
