if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcrypt');
const morgan = require('morgan');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const nodemailer = require('nodemailer');
const Customers = require('./models/Customers');
const Coffees = require('./models/Coffee');
const Donuts = require('./models/Donut');
const Workers = require('./models/workers');
const Reviews = require('./models/reviews');
const Cart = require('./models/cart');
const Orders = require('./models/orders');
const utility = require('./helper/utility');



//************** Connecting to mongoDB server****************

mongoose.connect('mongodb://localhost:27017/CoffeeDelight', {
 });
 
 const db=mongoose.connection;
 db.on("error", console.error.bind(console,"connection error : "));
 db.once("open",function(){
     console.log("Database connected");
 });

//**************Connection established*****************

app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));

const sessionArgs={
    name:'session',    
    secret:'***ilovedogs***',
    resave:false,
    saveUninitialized:true,
    cookie:{
        httpOnly:true,
        expires:Date.now() + 1000*60*60*24*7,
        maxAge:1000*60*60*24*7
    }
};

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(morgan('dev'));
app.use(session(sessionArgs));
app.use(flash());



//******************************ROUTES******************

app.get("/home",async function(req,res){
    let factor;
    if(!req.session.LoggedInUser)
    {
        factor=0;
    }
    else
    {
        factor=1;
    }
    
    const workers = await Workers.find({});
    res.render("WebPages/HomePage.ejs",{factor,workers,CustomerAddedSuccessfully:req.flash('CustomerAddedSuccessfully'),
    SuccessfullyLoggedIn:req.flash("SuccessfullyLoggedIn"),LogOutSuccess:req.flash("LogOutSuccess"),Response:req.flash("Response"),
    SuccessEdit:req.flash("SuccessEdit"),Success:req.flash("Success")});
})


//*****************Customers Code ***********************

app.get("/registration",function(req,res){
    res.render("customers/AddUser.ejs",{SameUser:req.flash('SameUser'),SameEmail:req.flash('SameEmail')});
})

app.post("/registration", async function(req,res){
    const {FullName,UserName,Email,Password,preference} = req.body;
    const user = await Customers.findOne({ username:UserName });
    const mail = await Customers.findOne({ email:Email });
    if(user != null) {
        req.flash("SameUser","This username is already taken, try some other username.");
        res.redirect("/registration");
    }
    else if(mail!=null) {
        req.flash("SameEmail","This email address is already used by some other user.");
        res.redirect("/registration");
    }
    else {
    const HashedPassword = await bcrypt.hash(Password, 12);  
    const customer = new Customers({ name:FullName.trim(), 
        username:UserName.trim(), 
        email:Email.trim(), 
        password:HashedPassword, 
        ingredient:preference
    });
    await customer.save();
    
    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        tls: {
            rejectUnauthorized: false,
        },
        auth: {
          user: utility.mailId,
          pass: utility.mailPassword, 
        },
      });
    
      let mailOptions = {
        from: utility.mailId, 
        to: `${Email}`, 
        subject: `Welcome ${FullName} ✔`, 
        text: "Greetings from CoffeeDelight, we thank you from joining our CoffeeDelight family, check out our website for more exciting stuff."
      }

      transporter.sendMail(mailOptions, (error,info) => {
        if(error){
            console.log(error);
        }else{
        console.log("Email sent successfully");
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        req.flash("CustomerAddedSuccessfully","Your Data Is Successfully Added In Our Database. Check your email.")
        res.redirect("/home");
        }
      })
    }
})

app.get("/update",function(req,res){
    const user = req.session.LoggedInUser;
    res.render("customers/update.ejs",{user});
})

app.post("/update/:id",async function(req,res){
    const{ Password, UserName, FullName } = req.body;
    let tempUserName = UserName.trim();
    const { id } = req.params;
    const person = await Customers.findById(id);
    const reviews = await Reviews.find({ user: person.username });
    for(let review of reviews) {
        await Reviews.findByIdAndUpdate(review._id, { user: tempUserName });
    }
    const hashedPassword = await bcrypt.hash(Password,12);
    const updatedUser = await Customers.findByIdAndUpdate(id, { 
        name: FullName,
        email: person.email, 
        username: tempUserName, 
        password: hashedPassword 
    }, { new: true });
    req.session.LoggedInUser = updatedUser;

    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        tls: {
            rejectUnauthorized: false,
        },
        auth: {
          user: utility.mailId,
          pass: utility.mailPassword, 
        },
    });
    let info = await transporter.sendMail({
        from: utility.mailId, 
        to: `${person.email}`, 
        subject: `Customer Details Updated Successfully`, 
        text: `Dear ${person.name}, the changes you made in your account details are applied successfully.`, 
    });
    
    console.log("Email sent successfully");
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    req.flash('SuccessEdit','Customer details were successfully updated.');
    res.redirect('/home'); 
})


app.get("/LogIn", function(req,res){
    res.render("customers/LogIn.ejs", { invalidCredentials: req.flash("invalidCredentials") });
})

app.post("/LogIn", async function(req, res) {
    const { UserName, Password } = req.body;
    const user = await Customers.findOne({ username: UserName });
    if(user) {
        const validpw = await bcrypt.compare(Password,user.password);
        if(validpw) {
            req.session.LoggedInUser = user;
            req.flash("SuccessfullyLoggedIn", `Successfully logged in as ${user.name}`);
            res.redirect("/home");
        }
        else
        {
            req.flash("invalidCredentials", `Please enter valid credentials.`);
            res.redirect("/LogIn");
        }
    } else {
        req.flash("invalidCredentials", `Please enter valid credentials.`);
        res.redirect("/LogIn");
    }
})

app.get("/LogOut", function(req,res){
    req.session.LoggedInUser=null;
    req.flash('LogOutSuccess','Successfully logged out of the system.');
    res.redirect("/home");
})

app.post("/like/:foodItem/:id", async function(req, res) {
    const { foodItem, id } = req.params;
    const loggedInUser = req.session.LoggedInUser;
    let flashMessage = 'Product added to your likes';
    if(foodItem == 'coffee') {
        const coffee = await Coffees.findById(id);
        if(coffee.likes && coffee.likes.includes(loggedInUser.username)) {
            await Coffees.findByIdAndUpdate(id, { $pull: { likes: loggedInUser.username } });
            flashMessage = 'Product removed from your likes';
        } else {
            if(!coffee.likes) {
                coffee.likes = [];
            }
            coffee.likes.push(loggedInUser.username);
            await coffee.save();
        } 
        req.flash('likesFlash', flashMessage);
        res.redirect('/HotCoffee');
    } else {
        const donut = await Donuts.findById(id);
        if(donut.likes && donut.likes.includes(loggedInUser.username)) {
            await Donuts.findByIdAndUpdate(id, { $pull: { likes: loggedInUser.username } });
            flashMessage = 'Product removed from your likes';
        } else {
            if(!donut.likes) {
                donut.likes = [];
            }
            donut.likes.push(loggedInUser.username);
            await donut.save();
        }
        req.flash('likesFlash', flashMessage);
        res.redirect('/donuts');
    }
})


//*********************Hot COffee Page********************

var coffeeFactor=0;
app.get("/HotCoffee",async function(req,res){
    let factor=0;
    coffeeFactor = 0;
    let user;
    let temp = [];
    const coffees = await Coffees.find({});
    if(req.session.LoggedInUser) {
        factor = 1;
        user = req.session.LoggedInUser;
        temp = await Cart.find({ customerUserName: user.username });
    } else {
        factor = 0;
        user = null;
    }
    res.render("WebPages/Coffee.ejs",{ factor, user, temp, coffees, 
        NotLoggedIn: req.flash('NotLoggedIn'),
        ReviewAdded: req.flash("ReviewAdded"), 
        ReviewDeleted: req.flash("ReviewDeleted"), 
        orderAdded: req.flash("orderAdded"),
        notAdded: req.flash("notAdded"), 
        orderRemoved: req.flash("orderRemoved"), 
        cartIsEmptied: req.flash("cartIsEmptied"), 
        emptyCart: req.flash("emptyCart"),
        likesFlash: req.flash("likesFlash")
    });
   
})

app.get("/preferredCoffees",async function(req,res){
    coffeeFactor=1;
    const allCoffees = await Coffees.find({});
    let filteredCoffees=[];
    const preferredIngredient = req.session.LoggedInUser.ingredient;
    for(let coffee of allCoffees)
    {
        for(let i=0;i<coffee.ingredients.length;i++)
        {
            if(preferredIngredient==coffee.ingredients[i])
            {
                filteredCoffees.push(coffee);
                break;
            }
        }
    }
    res.render("WebPages/preferredCoffees.ejs",{filteredCoffees,
        ReviewAdded:req.flash("ReviewAdded"),ReviewDeleted:req.flash("ReviewDeleted")});
})


//*********************Reviews Code*********************** 


app.get("/review/:coffee",async function(req,res){
    const {coffee} = req.params;
    if(!req.session.LoggedInUser)
    {
        req.flash("NotLoggedIn","You have to be logged in to add a review on our products.");
        res.redirect("/HotCoffee");
    }
    else{
        const user  = req.session.LoggedInUser;
        res.render("WebPages/AddReview.ejs",{user,coffee});
    }
})

app.post("/review/:coffee",async function(req,res){
    const {coffee} = req.params;
    const {rating,reviewbody} = req.body;
    const Coffee = await Coffees.findOne({name:coffee});
    const User = req.session.LoggedInUser;
    const review = new Reviews({rating:rating,body:reviewbody,user:User.username});
    await review.save();
    Coffee.reviews.push(review);
    await Coffee.save();
    if(coffeeFactor==0){
    req.flash("ReviewAdded","Review Added Successfully.")
    res.redirect("/HotCoffee");
    }
    else if(coffeeFactor==1){
        req.flash("ReviewAdded","Review Added Successfully.")
        res.redirect("/preferredCoffees");
        }
})

app.get("/showreviews/:coffee",async function(req,res){
    const {coffee} = req.params;
    let user;
    const Coffee = await Coffees.findOne({name:coffee}).populate("reviews");
    let factor=0;
    if(req.session.LoggedInUser)
    {
        factor=1;
        user=req.session.LoggedInUser.username;
        console.log(user);
    }
    else{
        factor=0;
        user=null;
    }
    res.render("WebPages/ShowReviews.ejs",{factor,Coffee,user});
})

app.post("/deletereview/:reviewid/:coffee",async function(req,res){
    const {reviewid,coffee} = req.params;
    await Coffees.findOneAndUpdate({name:coffee},{$pull:{reviews:reviewid}});
    await Reviews.findByIdAndDelete(reviewid);
    if(coffeeFactor==0){
    req.flash("ReviewDeleted","Review deleted successfully.")
    res.redirect("/HotCoffee");
    }
    else if(coffeeFactor==1){
        req.flash("ReviewAdded","Review Deleted Successfully.")
        res.redirect("/preferredCoffees");
        }
})



//******************Brewing page code********************

app.get("/SouthIndia",function(req,res){
    let factor;
    if(req.session.LoggedInUser)
    {
        factor=1;
    }
    else
    {
        factor=0;
    }
    res.render("WebPages/SouthIndian.ejs",{factor})
})
app.get("/Inverted",function(req,res){
    let factor;
    if(req.session.LoggedInUser)
    {
        factor=1;
    }
    else
    {
        factor=0;
    }
    res.render("WebPages/Inverted.ejs",{factor})
})
app.get("/Cold",function(req,res){
    let factor;
    if(req.session.LoggedInUser)
    {
        factor=1;
    }
    else
    {
        factor=0;
    }
    res.render("WebPages/ColdBrew.ejs",{factor})
})
app.get("/French",function(req,res){
    let factor;
    if(req.session.LoggedInUser)
    {
        factor=1;
    }
    else
    {
        factor=0;
    }
    res.render("WebPages/French.ejs",{factor})
})
app.get("/Channi",function(req,res){
    let factor;
    if(req.session.LoggedInUser)
    {
        factor=1;
    }
    else
    {
        factor=0;
    }
    res.render("WebPages/Channi.ejs",{factor})
})




//*********************************DONUTS CODE**********************************

app.get("/donuts",async function(req,res){
    const donuts = await Donuts.find({}); 
    let factor;
    let user;
    let temp=[];
    if(req.session.LoggedInUser)
    {
        factor=1;
        user=req.session.LoggedInUser;
        temp=await Cart.find({customerUserName:user.username});
    }
    else
    {
        factor=0;
        user=null;
    }
    res.render("WebPages/donuts.ejs",{ factor, user, temp, donuts, 
        NotLoggedIn: req.flash("NotLoggedIn"),
        ReviewAdded: req.flash("ReviewAdded"),
        ReviewDeleted: req.flash("ReviewDeleted"), 
        orderAdded: req.flash("orderAdded"), 
        notAdded: req.flash("notAdded"),
        orderRemoved: req.flash("orderRemoved"), 
        cartIsEmptied: req.flash("cartIsEmptied"), 
        emptyCart: req.flash("emptyCart"), 
        likesFlash: req.flash("likesFlash")
    });
})

app.get("/review/donuts/:donut",async function(req,res){
    const {donut} = req.params;
    if(!req.session.LoggedInUser)
    {
        req.flash("NotLoggedIn","You have to be logged in to add a review on our products.");
        res.redirect("/donuts");
    }
    else{
        const user  = req.session.LoggedInUser;
        res.render("WebPages/DonutReview.ejs",{user,donut});
    }
})

app.post("/review/donuts/:donut",async function(req,res){
    const {donut} = req.params;
    const {rating,reviewbody} = req.body;
    const Donut = await Donuts.findOne({name:donut});
    const User = req.session.LoggedInUser;
    const review = new Reviews({rating:rating,body:reviewbody,user:User.username});
    await review.save();
    Donut.reviews.push(review);
    await Donut.save();
    req.flash("ReviewAdded","Review Added Successfully.")
    res.redirect("/donuts");
})

app.get("/showreviews/donuts/:donut",async function(req,res){
    const {donut} = req.params;
    let user;
    const Donut = await Donuts.findOne({name:donut}).populate("reviews");
    let factor=0;
    if(req.session.LoggedInUser)
    {
        factor=1;
        user=req.session.LoggedInUser.username;
        console.log(user);
    }
    else{
        factor=0;
        user=null;
    }
    res.render("WebPages/ShowDonutReviews.ejs",{factor,Donut,user});
})

app.post("/deletereview/donuts/:reviewid/:donut",async function(req,res){
    const {reviewid,donut} = req.params;
    await Donuts.findOneAndUpdate({name:donut},{$pull:{reviews:reviewid}});
    await Reviews.findByIdAndDelete(reviewid);
    req.flash("ReviewDeleted","Review deleted successfully.")
    res.redirect("/donuts");
})

//************************************COFFEES CART CODE********************************

app.get("/addToCart/:coffee/:username",async function(req,res){
    const{coffee,username} = req.params;
    const customer = await Customers.findOne({username:username});
    const alreadyAdded = await Cart.findOne({customerUserName:username, productName:coffee});
    if(alreadyAdded==undefined)
    {
        const cartAdd = new Cart({customerUserName:username,customerName:customer.name,productName:coffee,quantity:1});
        await cartAdd.save();
    }
    else
    {
        let q = await Cart.findOne({customerUserName:username,productName:coffee});
        const x = ++q.quantity;
        const updateCart = await Cart.findOneAndUpdate({customerUserName:username,productName:coffee},{$set:{quantity:x}});       
    }
    req.flash("orderAdded","Product successsfully added in the cart.");
    res.redirect("/HotCoffee");
})

app.get("/removeFromCart/:coffee/:username",async function(req,res){
    const{coffee,username} = req.params;
    const alreadyAdded = await Cart.findOne({customerUserName:username, productName:coffee});
    if(alreadyAdded==undefined)
    {
        req.flash("notAdded","You cannot remove a product from the cart which was not added in it.");
        res.redirect("/HotCoffee");
    }
    else
    {
        let x = alreadyAdded.quantity-1;
        if(x==0)
        {
            const updateCart = await Cart.findByIdAndDelete(alreadyAdded._id);
        }
        else
        {
        const updateCart = await Cart.findOneAndUpdate({customerUserName:username,productName:coffee},{$set:{quantity:x}});
        }
        req.flash("orderRemoved","Product successfully removed from the cart.")
        res.redirect("/HotCoffee");       
    }
})

//************************************DONUTS CART CODE********************************

app.get("/addToCart/donuts/:donut/:username",async function(req,res){
    const{donut,username} = req.params;
    const customer = await Customers.findOne({username:username});
    const alreadyAdded = await Cart.findOne({customerUserName:username, productName:donut});
    if(alreadyAdded==undefined)
    {
        const cartAdd = new Cart({customerUserName:username,customerName:customer.name,productName:donut,quantity:1});
        await cartAdd.save();
    }
    else
    {
        const x = alreadyAdded.quantity+1;
        const updateCart = await Cart.findOneAndUpdate({customerUserName:username,productName:donut},{$set:{quantity:x}});       
    }
    req.flash("orderAdded","Product successsfully added in the cart.");
    res.redirect("/donuts");
})

app.get("/removeFromCart/donuts/:donut/:username",async function(req,res){
    const{donut,username} = req.params;
    const alreadyAdded = await Cart.findOne({customerUserName:username, productName:donut});
    if(alreadyAdded==undefined)
    {
        req.flash("notAdded","You cannot remove a product from the cart which was not added in it.");
        res.redirect("/donuts");
    }
    else
    {
        let x = alreadyAdded.quantity-1;
        if(x==0)
        {
            const updateCart = await Cart.findByIdAndDelete(alreadyAdded._id);
        }
        else
        {
        const updateCart = await Cart.findOneAndUpdate({customerUserName:username,productName:donut},{$set:{quantity:x}});
        }
        req.flash("orderRemoved","Product successfully removed from the cart.")
        res.redirect("/donuts");       
    }
})

//**************************************CART CONTENTS DISPLAYING CODE******************************

app.get("/goToCart/:product/:username",async function(req,res){
    const{username,product} = req.params;
    const contents = await Cart.find({customerUserName:username});
    const orders = await Orders.find({username:username});
    console.log(orders);
    const user = await Customers.findOne({username:username});
    const fullName = user.name;
    let temparr=[];
    let pricearr=[];
    let descarr=[];
    for(let x of fullName)
    {
        if(x!=" ")
        temparr.push(x);
        else if(x==" ")
        break;
    }
    let firstName = temparr.join('');
    let price = 0;
    if(contents.length==0)
    {
        req.flash("emptyCart","There are no products added in your cart.");
        res.redirect(`/${product}`);
    }
    else
    {
        const coffees = await Coffees.find({});
        const donuts = await Donuts.find({});
        for(let content of contents)
        {
            for(let coffee of coffees)
            {
                if(content.productName==coffee.name)
                {
                    price=price+(coffee.price*content.quantity);
                    pricearr.push(coffee.price);
                    descarr.push(coffee.description);
                }
            }
            for(let donut of donuts)
            {
                if(content.productName==donut.name)
                {
                    pricearr.push(donut.price);
                    price=price+(donut.price*content.quantity);
                    descarr.push(donut.description);
                }                
            }
        }
        res.render("WebPages/showCart.ejs",{user,orders,price,firstName,product,username,contents,pricearr,descarr});
    }
})

app.get("/emptyCart/:product",async function(req,res){
    const user = req.session.LoggedInUser;
    const {product} = req.params;
    const updateCart = await Cart.deleteMany({customerUserName:user.username});
    req.flash("cartIsEmptied","Your cart is now empty.");
    res.redirect(`/${product}`);
})

app.post("/placeOrder/:id", async function(req,res){
    const{id} = req.params;
    const user = await Customers.findById(id);
    const orders = await Cart.find({customerUserName:user.username});
    const newOrder = new Orders({username:user.username});
    await newOrder.save();
    for(let x of orders){
        await Orders.findByIdAndUpdate(newOrder._id,{$push:{products:x.productName}});
        await Orders.findByIdAndUpdate(newOrder._id,{$push:{quantity:x.quantity}});
    }
    req.flash("Success","Your order has been placed successfully.");
    res.redirect("/home");
})

//**********************SERVER ESTABLISHED********************

app.listen(3000,function(req,res){
    console.log("Local Server Established");
})