require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const Sequelize = require('sequelize');
const dns = require('dns');
const dbConfig = require('./config.json');
const env = "dev";
const dbSetting = dbConfig[env];
var val = 0;

const sequelize = new Sequelize(
    dbSetting.database,
    dbSetting.username,
    dbSetting.password,
    dbSetting.hostDialect
);


sequelize.authenticate().then(() => {
    console.log('Database connected...');
}).catch(err => {
    console.log('Error: ' + err);
});

// Basic Configuration
const port = process.env.PORT || 3000;

const URLs = sequelize.define('URLS', {
  url: {type:Sequelize.STRING, primaryKey:true},
  shortval:{type:Sequelize.INTEGER},
  },
  {
    timestamps: false
});

app.use(express.urlencoded({extended:true}));
app.use(express.json());

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

let dnsLookup = (url)=>{
  return new Promise((resolve,reject)=>{
    const options = {
      all:true,
    };
    dns.lookup(url, options, (err, addresses, family)=>{
      console.log(err);
      console.log("myaddres",addresses);
      console.log("myaddres",addresses[0].address);

      if(!err){
        let ip = addresses[0].address;
        resolve(ip);
      }
      else{
        resolve(false);
      }
    });
  });
}

//API to create path to redirect for shortvalue of url
app.get('/api/shorturl/:short_url',async (req,res)=>{
  let shortVal = req.params.short_url;
  const UrlObj = await URLs.findOne({
    where:{shortval:shortVal}
  });
  console.log(UrlObj);
  if(UrlObj===null){
    res.json({message:"Invalid short path"});
  }
  else{
    actualUrl = "http://"+UrlObj.dataValues.url;
    console.log(actualUrl);
    res.redirect(actualUrl);
  }

})

//API to accept url and create a shortvalue for it
app.post('/api/shorturl', async (req,res)=>{
  // console.log(req.body);
  let originalUrl = req.body.url;
  // const isValidUrl = await dnsLookup(originalUrl);
  // console.log("Hi",isValidUrl);
  originalUrl = originalUrl.replace(/(^\w+:|^)\/\//, "");
  await dnsLookup(originalUrl).then(
    async (data)=>{
      if(data){
        const [user,created] = await URLs.findOrCreate({
          where:{url: originalUrl},
          defaults:{shortval:val}
        });
      
        if(created){
          val = val+1;
        }
      
        res.json({
          original_url : originalUrl,
          short_url : user.shortval
        });
      }
      else{
        res.status(404).json({
          error: 'invalid url'
        });
      }
    }
  );
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
