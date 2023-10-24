const express = require("express");
const session = require("express-session");
const app = express();
const checkGroup = require("./checkgroup");
const authentication = require("./authentication");
const usermanagement = require("./usermanagement");
const taskmanagement = require("./taskmanagement");
const checkgroup = require("./checkgroup");
const port = 4000;
const bodyParser = require("body-parser");
const cors = require("cors");

// Initialize the app and add middleware
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true })); // Setup the body parser to handle form submits
app.use(session({ secret: "super-secret" })); // Session setup
app.use(express.json());
app.use(cors());

// Login function
app.post("/login", authentication.login);

// Logout function
app.get("/logout", authentication.logout);

// Create New User function
app.post("/createnewuser", usermanagement.createnewuser);

// Change Password function
app.post("/changepassword", usermanagement.changepassword);

// Change Email function
app.post("/changeemail", usermanagement.changeemail);

// Change User Group function
app.post("/changegroup", usermanagement.changegroup);

// Change Status function
app.post("/changestatus", usermanagement.changestatus);

// Get Groups function
app.post("/getgroups", usermanagement.getgroups);

// Create Group function
app.post("/creategroup", usermanagement.creategroup);

// Check admin function
app.post("/checkmygroup", checkgroup.isGroup);

// Get userdetails function
app.post("/getuserdetails", usermanagement.getUserDetails);

// change email common function
app.post("/changeemailcommon", usermanagement.changeemailcommon);

// change password common function
app.post("/changepasswordcommon", usermanagement.changepasswordcommon);

// inActive user function
app.post("/isactive", authentication.isActive);

// Create App function
app.post("/createapp", taskmanagement.createApp);

// create task function
app.post("/createtask", taskmanagement.createTask);

// create plan function
app.post("/createplan", taskmanagement.createPlan);

// promote task function
app.post("/promotetask", taskmanagement.promoteTask);

// demote task function
app.post("/demotetask", taskmanagement.demoteTask);

// get plan details function
app.post("/getplandetails", taskmanagement.getPlanDetails);

// get app details function
app.post("/getappdetails", taskmanagement.getAppDetails);

// get task notes function
app.post("/gettasknotes", taskmanagement.GetTaskNotes);

// get app acronyms function
app.post("/getappacronyms", taskmanagement.getAppAcronym);

// get plan name function
app.post("/getplanname", taskmanagement.getPlanName);

// edit task function
app.post("/edittask", taskmanagement.editTask);

// edit plan function
app.post("/editplan", taskmanagement.editPlan);

// edit app function
app.post("/editapp", taskmanagement.editApp);

// View task details function
app.post("/viewtaskdetails", taskmanagement.viewTaskDetails);

// Get task details kanban function
app.post("/gettaskdetailskanban", taskmanagement.GetTaskDetailsKanban);

// get apppermitopen function
app.post("/getapppermitopen", taskmanagement.getAppPermitOpen);

// get apppermittodo function
app.post("/getapppermittodo", taskmanagement.getAppPermitToDo);

// get apppermitdoing function
app.post("/getapppermitdoing", taskmanagement.getAppPermitDoing);

// get apppermitdone function
app.post("/getapppermitdone", taskmanagement.getAppPermitDone);

// get apppermitcreate function
app.post("/getapppermitcreate", taskmanagement.getAppPermitCreate);

// get app details for one app function
app.post("/getappdetailsforoneapp", taskmanagement.getAppDetailsForOneApp);

/** App listening on port */
app.listen(port, () => {
  console.log(`TMS app listening at http://localhost:${port}`);
});
