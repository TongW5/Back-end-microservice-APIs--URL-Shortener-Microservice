require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns= require('dns')
const bodyParser= require('body-parser');
const mongoose=require('mongoose');

// Basic Configuration
const port = process.env.PORT || 3000;


app.use(cors());

app.use(bodyParser.urlencoded({extended:false}));

app.use(bodyParser.json());


app.use('/public', express.static(`${process.cwd()}/public`));

//config mongoose database

mongoose.connect('YOUR MONGODB URI')
.then(console.log('database connected'))
.catch(err=>{
  console.log(err)
 })


const Schema=mongoose.Schema;

const PairSchema=new Schema({
	orig:String,
	shortUrl:Number
})

const Pair=mongoose.model('pair',PairSchema);


app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});


//create middle for checking if the url is valid
const middleware=async (req, res, next)=>{

	const {url}=req.body; 

	//check if the url shtart with "http://" or "https://"

	if(!(/^https?:\/\//.test(url))){
    console.log('incorrect url form')
    res.json({ error: 'invalid url' });
    return
    };

  
//get the url with only the main part from the origin url (mUrl) , remove the fragment and query parameter from a url

   let mUrl;

   const firstbackSlash= url.indexOf("/");


    const thirdBackSlack =url.indexOf("/",(firstbackSlash+2));

    if(thirdBackSlack===-1){
 
      mUrl=url.slice();
   }else{
	   mUrl=url.slice(0,thirdBackSlack)

   }


// check if the website domin exist,and proceed if the url is a valid web-address
    dns.lookup(mUrl.replace(/^https?:\/\//, ''),(err,addresses)=>{
    if(err){
      console.log(err);
      res.json({ error: 'Invalid URL' })
      }else{
       console.log('valid url');
       next();
      }
      }
    )
}

//if the website is valid, add the new url to the database
app.post('/api/shorturl',middleware,async(req,res)=>{

 const {url}=req.body;

  //check if the website is already saved in the database 

   const findResult= await Pair.find({orig:url})


  if(findResult.length>0){
  	console.log('url already in the database')
  	res.json({original_url:url,short_url:findResult[0].shortUrl})
  }else{

  const number=await Pair.countDocuments();

  const newPair=new Pair({
  	//use the length of the documents in the collection as the short_url;
  	orig:url,
  	shortUrl:number+1
  })

  newPair.save()
  .then(()=>console.log('pair are added'))
  .catch((err)=>res.status(400).json(err))

  res.json({original_url:url,short_url:newPair.shortUrl})

  }
  
 })


//to reach the original url by using the shorted url
app.get('/api/shorturl/:shortUrl', async(req, res) =>{
    const {shortUrl} = req.params;


   const findResult= await Pair.find({shortUrl:shortUrl});

   if(findResult.length>0){


  const resultUrl = findResult[0].orig;

  res.status(301).redirect(resultUrl)

}
});


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
