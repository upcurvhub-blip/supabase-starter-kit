# Remix of Upcurv Trades

🚗✨ CAR WASH & DETAILING SAAS – COMPLETE FEATURE DOCUMENT (2025 Version)

Keep left side bar as constant, no landing page direct login page, color option use primary as yellow and zoho mnc style smoothly, no harcoded datas all data must be reflected from db and ensure the web app is a multi tenant architecture by variating using user id and rls policies

Including WhatsApp Chat AI Booking System

🧩 TOP MODULES
Customer + Vehicle CRM
WhatsApp AI Booking System (NEW + PREMIUM FEATURE)
Online Booking & Scheduling
Job Card & Service Workflow
Billing & Invoicing
Subscription / Membership Passes
Staff & Attendance Management
Inventory & Material Tracking
WhatsApp Automation (Reminders, Receipts, Status)
Marketing & Offers
Multi-Branch Management
Reports & Analytics
Admin & Customization Settings
⭐ 1. CUSTOMER & VEHICLE CRM
Features
Add customer profile
Add multiple vehicles under one customer
Track service history (all visits, invoices, photos)
Profile auto-created from WhatsApp booking
Save customer preferences + notes
Track pending payments
Tag customers (VIP, regular, subscription user)
Workflow
Customer visits or messages WhatsApp
System auto-detects phone number
Shows existing or creates new customer
Add/update car details
All future bookings auto-linked
⭐ 2. WHATSAPP AI BOOKING SYSTEM (NEW – MOST IMPORTANT)
Features
Customer books directly from WhatsApp
Automated chatbot conversation flow
Smart service selection
Smart time slot selection
Vehicle details collected
Auto-creates booking inside your SaaS
Auto-creates job card (optional)
Staff gets instant alert
Customer receives instant confirmation
NLP to understand natural messages (optional)
Example Messages Customer Sends
“Book a wash today at 4pm”
“Need foam wash for TN37AX2211 tomorrow morning”
“Do you have a slot now?”
“Interior cleaning today evening”
How It Works (Step-by-Step Workflow)
STEP 1: Incoming Message
Customer messages your WhatsApp business number.
STEP 2: Bot Reads & Identifies
Bot identifies:
Service type
Date
Time
Vehicle details
Customer name (if provided)
If missing → Bot asks questions with quick replies.
STEP 3: Slot Availability
Bot checks availability from calendar.
STEP 4: Customer Confirms
Bot sends summary:
“Foam Wash — Today — 4:00 PM — Swift TN67BA2233. Confirm?”
STEP 5: Auto Booking Creation
After confirmation:
Create customer record
Create vehicle record
Create booking
Assign time slot
Send confirmation
STEP 6: Staff Dashboard Update
Booking appears instantly in WhatsApp Booking Tab.
STEP 7: Optional Auto Job Card
If enabled:
Job card auto created
Assigned to default wash bay
⭐ 3. ONLINE BOOKING & SCHEDULING (NORMAL)
Features
Customer-facing booking portal
Time slot management
Multi-service selection
Availability checker
Auto-reminders
Syncs with WhatsApp bookings
Workflow
Customer selects service
Selects date/time
Booking confirmed
Staff notified
Job card auto-prepared
⭐ 4. JOB CARD & SERVICE WORKFLOW
Features
Create job card manually or auto
Add damage notes + photos
Assign staff or wash bay
Track job stages:
Check-in
Pre-wash
Foam wash
Interior
Polishing/Detailing
QC
Completed
Add upsell items
Add internal notes
Upload before/after photos
Workflow
Car arrives → Open Job Card
Add inspection images
Assign to washing staff
Staff updates each stage
QC verifies
Status switches to “Ready for Delivery”
Billing auto-generates
⭐ 5. BILLING & INVOICING
Features
Convert Job Card → Bill
Itemized services
Add-ons, upsells
GST on/off
Discount & coupon support
Payment modes:
UPI
Cash
Card
Subscription
Invoice PDF
WhatsApp invoice sending
Workflow
Job card complete
Bill auto-created
Staff reviews & edits
Payment collected
Invoice stored + sent
⭐ 6. SUBSCRIPTION / MEMBERSHIP PASSES
Features
Monthly unlimited wash plan
Weekly wash plan
5/10/20 wash passes
Auto-renew billing
Usage tracking
Reminders for renewal
WhatsApp “auto-deduct wash count”
Workflow
Customer buys subscription
Visits → System auto-deduct wash
If 0 left → Bot sends renewal message
⭐ 7. STAFF & ATTENDANCE
Features
Add staff roles
Attendance (QR or manual)
Assign jobs to staff
Track staff performance
Tips & incentive management
Salary & payment summary
Workflow
Staff checks in
Assigned job cards
Updates stages
System calculates output
⭐ 8. INVENTORY / MATERIAL TRACKING
Features
Add consumables
Auto-deduct materials per job
Low stock alert
Purchase & vendor logs
Stock report
Workflow
Add service → define material use
Job completed → items auto-reduce
Alert when low
⭐ 9. WHATSAPP AUTOMATION (NOT BOOKING – OTHER FLOWS)
Automated Messages
Booking confirmation
Arrival reminder
Car ready notification
Invoice sharing
Subscription expiry reminder
Wash reminder (7 days/15 days)
Offer broadcasts
Feedback requests
Workflow
Event triggers →
Template selected →
WhatsApp API sends message
⭐ 10. MARKETING & OFFERS
Features
Create coupons
Push weekend offers
Segment customers
Send WhatsApp campaigns
Collect reviews
Referral system
Workflow
Owner creates offer
Select audience
Campaign sent
Track performance
⭐ 11. MULTI-BRANCH MANAGEMENT
Features
Add branches
Assign staff
Separate inventory per branch
Central reporting
WhatsApp booking routing:
Based on location
Based on number dialed
Workflow
Customer initiates booking
System checks nearest branch
Auto-assigns booking
⭐ 12. REPORTS & ANALYTICS
Reports
Daily cars washed
Monthly revenue
Top performing services
Staff performance
Subscription reports
Inventory consumption
Payment method distribution
Repeat customers ratio
Analytics
Revenue trends
Peak time slots
Lost customers
Vehicle type analytics
⭐ 13. ADMIN & CUSTOMIZATION
Features
Add/edit services
Edit pricing
Set job stages
Set working hours
Custom invoice templates
GST toggle
WhatsApp API settings
Subscription plan setup
Staff permissions
Branch management
🌀 FULL END-TO-END SYSTEM CYCLE (WITH WHATSApp BOOKING)
1. Customer sends WhatsApp message
↓
2. Bot asks questions → collects service/time/vehicle
↓
3. Bot checks slot availability
↓
4. Customer confirms
↓
5. System auto-creates booking
↓
6. Job Card auto-created (optional)
↓
7. Staff sees job in dashboard
↓
8. Car arrives → Inspection → Photos
↓
9. Job stages completed
↓
10. QC approves
↓
11. Auto-generate bill
↓
12. Invoice sent on WhatsApp
↓
13. Customer pays
↓
14. System schedules next reminder
↓
15. Customer returns → Cycle repeats

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/93959fc0-c5ab-427d-accf-9f7dee7c9e66).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
