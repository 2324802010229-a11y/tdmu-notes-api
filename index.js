const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint API "Hello Cloud"
app.get('/api', (req, res) => {
    res.json({
        message: "Hello Cloud",
        project: "TDMU Notes API",
        timestamp: new Date().toISOString()
    });
});

// Endpoint trang chủ
app.get('/', (req, res) => {
    res.send("<h1>TDMU Notes API Service</h1><p>API status: Running</p>");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});