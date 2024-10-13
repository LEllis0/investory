const app = require('./app.js');
const cors = require('cors');

require('dotenv').config();

const port = process.env.PORT || 3000;

app.use(cors());

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});