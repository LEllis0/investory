// This is the launch page connecting the APIs

require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.get('/', (req, res) => {
  fetch(`${process.env.BASE_URL}/assets`)
    .then(response => response.json())
    .then(data => {
        if (!data.error) {
          res.render('dashboard', { base_url: process.env.BASE_URL, current_page:'dashboard', assets_data:data.data});
        } else {
            console.error('Error fetching assets:', data.message);
        }
    })
    .catch(error => console.error('Error:', error));
});

app.get('/portfolio', (req, res) => {
  res.render('assets', { base_url: process.env.BASE_URL, current_page:'assets'});
});

app.get('/market', (req, res) => {
  res.render('markets', { base_url: process.env.BASE_URL, current_page:'markets'});
});

app.get('/history', (req, res) => {
  res.render('history', { base_url: process.env.BASE_URL, current_page:'history'});
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
