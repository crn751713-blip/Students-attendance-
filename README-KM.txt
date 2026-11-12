STUDENT ATTENDANCE — សេចក្តីណែនាំដំឡើង (សូមអានមុន Deploy)

សំខាន់៖ កូដនេះជាគម្រោងដំបូងសម្រាប់សាកល្បង។ កុំបើកឱ្យសិស្សប្រើជាសាធារណៈ រហូតដល់បានដំឡើង Rules និងសាកល្បង Admin/Security រួច។

1) Firebase Console
- Authentication > Sign-in method > Email/Password: Enable
- Firestore Database: Create database
- Project settings > Your apps > Web app: ចម្លង firebaseConfig ទៅ script.js
- Firestore > Rules: ដាក់មាតិកា firestore.rules រួច Publish។
- កុំបើក Test mode។

2) ImageKit
- ត្រូវការ Public Key, URL Endpoint និង Private Key។
- Private Key ដាក់តែក្នុង Vercel Environment Variables ឈ្មោះ IMAGEKIT_PRIVATE_KEY។
- Public Key ដាក់ក្នុង Vercel Environment Variables ឈ្មោះ IMAGEKIT_PUBLIC_KEY។
- URL Endpoint ដាក់ក្នុង Vercel Environment Variables ឈ្មោះ IMAGEKIT_URL_ENDPOINT។
- មិនត្រូវដាក់ Private Key ក្នុង script.js ឬ GitHub ទេ។

3) Vercel Environment Variables
FIREBASE_PROJECT_ID = student-attendance-it
FIREBASE_SERVICE_ACCOUNT = JSON ពេញលេញនៃ Firebase service account (រក្សាសម្ងាត់!)
BOOTSTRAP_SECRET = បង្កើតពាក្យសម្ងាត់សម្ងាត់វែង និងចៃដន្យ
IMAGEKIT_PUBLIC_KEY = public key
IMAGEKIT_PRIVATE_KEY = private key (secret)

4) Firebase Service Account
Firebase Console > Project settings > Service accounts > Generate new private key។
រក្សា JSON នោះសម្ងាត់បំផុត។ បញ្ចូល JSON ទាំងមូលជា Environment Variable FIREBASE_SERVICE_ACCOUNT ក្នុង Vercel។
កុំផ្ញើឯកសារនេះទៅ ChatGPT ឬដាក់ GitHub។

5) បង្កើត Admin account
- Firebase Authentication > Add user
- Email: admin@attendance.local
- ដាក់ Password ខ្លាំងមួយ។
- នៅក្នុង Vercel Project > Settings > Environment Variables ដាក់ BOOTSTRAP_SECRET ជាសម្ងាត់។
- បន្ទាប់ពី Deploy រួច ប្រើ curl/Postman ឬ API client POST ទៅ /api/bootstrap-admin
  Header: x-bootstrap-secret: YOUR_BOOTSTRAP_SECRET
  Content-Type: application/json
  Body: {"email":"admin@attendance.local"}
- បន្ទាប់ពីបាន {ok:true} ចេញពី Admin ហើយ Login វិញ ដើម្បីទទួល custom claim admin។

6) Login
- Admin ID: admin (email alias admin@attendance.local)
- Student ID ឧ. ST001 នឹងបម្លែងទៅ st001@attendance.local
- Admin បង្កើតសិស្សតាម Admin tab។

7) Deploy
- Upload folder contents to GitHub repository (keep api/ folder).
- Import repository into Vercel.
- Framework Preset: Other; Build Command empty; Output Directory ".".
- Add Environment Variables above, then Deploy.

8) កំណត់សម្គាល់
- ការបង្ហោះរូបត្រូវការ ImageKit Private Key តែ backend ប្រើវាបង្កើត signature ខ្លីៗ។
- រូប Profile ត្រូវបានបង្ហោះជារូបសាធារណៈតាម ImageKit URL។ កុំបង្ហោះរូបឯកជន/ឯកសារសំខាន់។
- Evidence URL ក្នុងគម្រោងនេះបង្ហាញក្នុង report ទៅ Admin និងម្ចាស់ report; ImageKit URL អាចចូលបានដោយអ្នកដែលមាន URL។ សម្រាប់ Evidence សម្ងាត់ពិតប្រាកដ ត្រូវប្រើ private files + backend access control។
- សិស្សទាំងអស់អាចអាន attendance records តាម Firestore Rules ដើម្បីមើលវត្តមានមិត្តរួមថ្នាក់។ កុំដាក់ព័ត៌មានឯកជនផ្សេងទៀតក្នុង attendance document។
- មិនមានមុខងារប្តូរ password ក្នុង UI នៅជំនាន់ដំបូងទេ; អាចប្រើ Firebase password reset/admin reset។
- ត្រូវសាកល្បងជាមួយគណនីសាកល្បង មុនដាក់ប្រើពិត។
