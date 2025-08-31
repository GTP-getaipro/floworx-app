# 📧 Gmail App Password Setup Guide

## **🎯 What You Need**
Your current email configuration is almost perfect! You just need to replace the regular Gmail password with a Gmail App Password for security.

## **📍 Current Configuration**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=floworx.ai@gmail.com
SMTP_PASS=aDsfjklsasdlfkja23!  # ← This needs to be an App Password
FROM_EMAIL=floworx.ai@gmail.com
FROM_NAME=Floworx Team
```

## **🔧 Step-by-Step Gmail App Password Setup**

### **Step 1: Enable 2-Factor Authentication**
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click on **"Security"** in the left sidebar
3. Under **"How you sign in to Google"**, click **"2-Step Verification"**
4. Follow the setup process to enable 2FA (required for App Passwords)

### **Step 2: Generate App Password**
1. Still in **Security** settings, scroll down to **"2-Step Verification"**
2. Click on **"App passwords"** (this option only appears after 2FA is enabled)
3. You may need to sign in again
4. In the **"Select app"** dropdown, choose **"Mail"**
5. In the **"Select device"** dropdown, choose **"Other (custom name)"**
6. Enter: **"Floworx SaaS"** as the custom name
7. Click **"Generate"**

### **Step 3: Copy the App Password**
- Google will show you a **16-character password** like: `abcd efgh ijkl mnop`
- **Copy this password exactly** (including spaces, or remove spaces - both work)
- This is your new `SMTP_PASS` value

### **Step 4: Update Environment Files**

Update these files with your new App Password:

#### **Root .env file:**
```env
SMTP_PASS=abcdefghijklmnop  # Your actual 16-character App Password
```

#### **backend/.env file:**
```env
SMTP_PASS=abcdefghijklmnop  # Your actual 16-character App Password
```

#### **backend/.env.production file:**
```env
SMTP_PASS=abcdefghijklmnop  # Your actual 16-character App Password
```

## **✅ Test Your Configuration**

After updating the App Password, run:

```bash
# Test email service
node scripts/test-email-service.js

# This should now show:
# ✅ SMTP Connection: ✅
# ✅ Test Email Sent: ✅
```

## **🔒 Security Notes**

### **App Password Benefits:**
- ✅ More secure than regular passwords
- ✅ Can be revoked independently
- ✅ Doesn't expose your main Google password
- ✅ Required for SMTP access with 2FA enabled

### **Important Security Tips:**
- ❌ **Never share** your App Password
- ❌ **Never commit** App Passwords to version control
- ✅ **Revoke and regenerate** if compromised
- ✅ **Use different App Passwords** for different applications

## **🚨 Troubleshooting**

### **"App passwords" option not showing?**
- Ensure 2-Factor Authentication is fully enabled
- Wait a few minutes after enabling 2FA
- Try signing out and back in to Google Account

### **Still getting authentication errors?**
- Double-check the App Password was copied correctly
- Remove any spaces from the App Password
- Ensure you're using the correct Gmail address
- Try generating a new App Password

### **Alternative: Use a different email service**
If Gmail App Passwords are problematic, consider:

#### **SendGrid (Recommended for Production):**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
FROM_EMAIL=noreply@floworx-iq.com
FROM_NAME=Floworx Team
```

#### **Mailgun:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your_mailgun_password
FROM_EMAIL=noreply@floworx-iq.com
FROM_NAME=Floworx Team
```

## **📱 Visual Guide**

When you're in Google Account Security settings:

```
Security
├── How you sign in to Google
│   ├── 2-Step Verification [ENABLE THIS FIRST]
│   └── App passwords [CLICK HERE AFTER 2FA]
│       ├── Select app: Mail
│       ├── Select device: Other (custom name)
│       ├── Custom name: "Floworx SaaS"
│       └── [Generate] ← Gets your 16-character password
```

## **🔄 Next Steps**

After setting up the Gmail App Password:

1. ✅ Update all environment files with the App Password
2. ✅ Run email service test: `node scripts/test-email-service.js`
3. ✅ Verify you receive the test email
4. ✅ Proceed to Google OAuth verification
5. ✅ Deploy to production

## **📞 Need Help?**

If you encounter issues:
1. Check the [Gmail SMTP documentation](https://support.google.com/mail/answer/7126229)
2. Verify your Google Account security settings
3. Consider using SendGrid for production (more reliable for high-volume sending)

## **🎉 Success Indicators**

You'll know it's working when:
- ✅ `node scripts/test-email-service.js` shows all green checkmarks
- ✅ You receive a test email in your inbox
- ✅ No authentication errors in the logs
- ✅ Email templates render correctly

Your email service will then be ready for:
- 📧 User verification emails
- 🎉 Welcome emails
- 📬 Onboarding reminders
- 🔔 System notifications
