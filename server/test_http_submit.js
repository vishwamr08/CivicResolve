const fs = require('fs');
const path = require('path');

async function testSubmitComplaint() {
  const dummyImagePath = path.join(__dirname, 'test_sample.png');
  // 1x1 transparent png
  const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
  fs.writeFileSync(dummyImagePath, pngBuffer);

  const formData = new FormData();
  formData.append('title', 'Water Leakage: Severe pipeline crack on 5th main');
  formData.append('description', 'Drinking water pipeline cracked and spraying water onto pedestrian sidewalk for past 12 hours.');
  formData.append('category', 'Water Leakage');
  formData.append('location', '5th Main, Jayanagar 4th Block');
  formData.append('latitude', '12.9298');
  formData.append('longitude', '77.5834');

  const fileBlob = new Blob([fs.readFileSync(dummyImagePath)], { type: 'image/png' });
  formData.append('image', fileBlob, 'sample_burst.png');

  console.log('Sending POST /api/complaints...');
  const res = await fetch('http://127.0.0.1:5000/api/complaints', {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  console.log('Response status:', res.status);
  console.log('Created Complaint:', {
    id: json.complaint?.id,
    ref_id: json.complaint?.ref_id,
    title: json.complaint?.title,
    category: json.complaint?.category,
    image_url: json.complaint?.image_url,
    ai_status: json.complaint?.ai_status,
    department: json.complaint?.department
  });

  // Verify GET /api/complaints/:id
  const getRes = await fetch(`http://127.0.0.1:5000/api/complaints/${json.complaint.id}`);
  const fetched = await getRes.json();
  console.log('Verification GET /api/complaints/:id successful:', fetched.ref_id === json.complaint.ref_id);

  if (fs.existsSync(dummyImagePath)) fs.unlinkSync(dummyImagePath);
}

testSubmitComplaint().catch(err => {
  console.error('Submission test error:', err);
  process.exit(1);
});
