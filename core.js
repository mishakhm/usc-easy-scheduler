class Course {
    constructor(CourseData){
        this.prefix = CourseData.prefix;
        this.number = CourseData.number;
        this.sequence = CourseData.sequence;
        this.code = this.prefix + "-" + this.number;
        if (typeof this.sequence == "string"){
            this.code += this.sequence;
        }
        this.suffix = CourseData.suffix;
        this.title = CourseData.title;
        this.prereq_text = CourseData.prereq_text;
        this.coreq_text = CourseData.coreq_text;
        this.units = "0.0";
        this.SectionData = [];
        if (Array.isArray(CourseData.SectionData)){
            for(let i = 0; i<CourseData.SectionData.length; i++){
                //Find how many units the course is worth
                //because only one section will have the number of units
                if(parseFloat(CourseData.SectionData[i].units) > parseFloat(this.units)){
                    this.units = CourseData.SectionData[i].units;
                }
                //Grab all sections, as Section class objects
                this.SectionData.push(new Section(CourseData.SectionData[i], this.code, this.prefix));
            }}
            else{
                this.units = CourseData.SectionData.units;
                this.SectionData.push(new Section(CourseData.SectionData, this.code, this.prefix));
            }
    }
    createHTML(addTo, type){
        //Create div for all info for a single course
        var displayCourse = document.createElement("div");
        displayCourse.className = "searchResult";

        //Create button with outer info
        var text = this.code;
        if (typeof this.suffix == "string"){
            text += " " + this.suffix;
        }
        var button = addElement("button", "searchResultButton", displayCourse, "");
        addElement("p", "", button, text + ": " + this.title);
        addElement("p", "", button, "Units: " + this.units);
        
        //Add course info
        var displayCourseInfo = document.createElement("div");
        displayCourseInfo.className = "displayCourseInfo";
        //"Add class" button if in search
        if (type == "search"){
            var addClassButton = addElement("button", "addClass", displayCourseInfo,
                "Add class to my list");
            addClassButton.addEventListener('click', () =>
                this.add()
            );
        }
        //Add pre-req and co-req info
        if (typeof this.prereq_text == "string"){
            addElement("div", "", displayCourseInfo,
            "Pre-reqs: " + this.prereq_text)}
        if (typeof this.coreq_text == "string"){
            addElement("div", "", displayCourseInfo,
            "Co-reqs: " + this.coreq_text)}
        //Add all course sections to info
        for(let j = 0; j<this.SectionData.length; j++){
            this.SectionData[j].createHTML(displayCourseInfo, type);
        }
        displayCourse.appendChild(displayCourseInfo);
        //Add the whole course div to the results
        addTo.appendChild(displayCourse);
        //Add accordion dropdown functionality
        button.addEventListener('click', function () {
            toggleShow(this.nextElementSibling);})
    }
    //Adds the given class to myClasses if it is not already in it
    add(){
        if(containsClass(classes, this.code)==-1) {
            var index = classes.push(this);
            //Save updated list of classes
            //storage.sync currently exceeds QUOTA_BYTES_PER_ITEM but may be ideal
            chrome.storage.local.set({'classes': classes});
            //Add the HTML for the newly added class to myClasses div
            classes[index-1].createHTML(document.getElementById("myClassesContainer"), "myClasses");
        }
    }
}

class Section {
    constructor(SectionData, code, prefix){
        this.code = code;
        this.prefix = prefix;
        this.id = SectionData.id;
        this.instructor = SectionData.instructor;
        this.type = SectionData.type;
        this.dclass_code = SectionData.dclass_code;
        this.number_registered = SectionData.number_registered;
        this.spaces_available = SectionData.spaces_available;
        this.start_time = SectionData.start_time;
        this.end_time = SectionData.end_time;
        this.startMinutes = parseInt(SectionData.start_time.slice(-2));
        this.startHours = parseInt(SectionData.start_time.slice(0, 2));
        this.endMinutes = parseInt(SectionData.end_time.slice(-2));
        this.endHours = parseInt(SectionData.end_time.slice(0, 2));
        this.day = SectionData.day;
        this.daySections = [];
        this.units = SectionData.units;
        if(typeof SectionData.scheduled == "boolean"){
            this.scheduled = SectionData.scheduled;
        }
        else{
            this.scheduled = false;
        }
        if(typeof this.day == "string"){
            var dayParse = this.day;
            while (dayParse != ""){
                var currentDay = dayParse.slice(-1);
                dayParse = dayParse.slice(0,-1);
                this.daySections.push({day: currentDay});   
            }}
        this.sched = () => this.schedule();
        this.unsched = () => this.unschedule();
    }
    createHTML(addTo, type){
        var sectionDiv = document.createElement("div");
        sectionDiv.className = "searchSection";
        
        var label = addElement("p", "sectionLabel", sectionDiv, this.id + " "
        + this.dclass_code + ": " + this.type);
        if(this.type.includes("Lec")){
            label.style.color = "green";
        }
        else if(this.type.includes("Lab")){
            label.style.color = "#66f";
        }
        else if(this.type.includes("Qz")){
            label.style.color = "#909";
        }


        var dayText = "";
        if(typeof this.day == "string"){
            var dayParse = this.day;
            while (dayParse != ""){
                var currentDay = dayParse.slice(0,1);
                dayParse = dayParse.slice(1);
                if (currentDay == "T"){
                    dayText += "Tu";
                }
                else if (currentDay == "H"){
                    dayText += "Th";
                }
                else {
                    dayText += currentDay;
                }
            }    
        }
        else{
            dayText = "No days listed, times:";}
        addElement("p", "", sectionDiv, dayText + " "
        + this.start_time + "-" + this.end_time);

        //Check if an instructor is listed, and either display their name or a message
        if (typeof this.instructor != "undefined"){
            if(Array.isArray(this.instructor)){
                for(let k = 0; k<this.instructor.length;k++){
                    addElement("p", "", sectionDiv, 
                    this.instructor[k].last_name
                    + ", " + this.instructor[k].first_name);}
            }
            else{
                addElement("p", "", sectionDiv, 
                this.instructor.last_name
                + ", " + this.instructor.first_name);}}
        else{addElement("p", "", sectionDiv, "No instructor listed");}

        addElement("p", "", sectionDiv, 
        this.number_registered
        + "/" + this.spaces_available);

        //Add "schedule section" button if this is called for myClasses
        if(type == "myClasses"){
            var schedSectButton = addElement("button", "schedSect", sectionDiv,
                "Schedule section");
            schedSectButton.addEventListener('click', this.sched);
        }
        this.sectionDiv = sectionDiv;
        addTo.appendChild(sectionDiv);
    }
    //Checks if the section conflicts with any already scheduled ones
    //If not, creates divs on the calendar for each day of the section
    conflicts(){
        var start = this.startMinutes + this.startHours*60;
        var end = this.endMinutes + this.endHours*60;
        var ret = [];
        for(let i = 0; i<calSections.length; i++){
            var startCheck = calSections[i].startMinutes + calSections[i].startHours*60;
            var endCheck = calSections[i].endMinutes + calSections[i].endHours*60;
            if((start>=startCheck && start<=endCheck)
                || (end>=startCheck && end<=endCheck)){
                    for(let j = 0; j<this.daySections.length; j++){
                        var matches = calSections[i].daySections.filter(
                            e => e.day === this.daySections[j].day);
                        if(matches.length > 0){
                            ret.push(matches);
                        }
                    }
                }
        }
        return ret;
    }
    schedule(){
        if(this.conflicts().length > 0){
            alert("This section conflicts with an already scheduled section");
        }
        else{
            this.scheduled = true;
            var cal = document.getElementById("scrollcal");
            var unschedButton = [];
            for(let i = 0; i<this.daySections.length; i++){
                var sectionDiv = addElement("div", "calsection", cal,
                this.code + ": (" + this.id + "), " + this.type);

                unschedButton.push(addElement("button", "", sectionDiv, "X"));

                this.daySections[i].sectionDiv = sectionDiv;
            }
            for(let i = 0; i<unschedButton.length; i++){
                unschedButton[i].addEventListener('click', () =>
                    this.unschedule()
                );
            }
            //Position the newly created div on the calendar based on date/time
            this.position();
            //Change the "schedule section" button in myClasses to "unschedule section"
            var schedSectButton = this.sectionDiv.getElementsByClassName("schedSect")[0];
            schedSectButton.innerHTML = "Unschedule section";
            schedSectButton.style.color = "red";
            schedSectButton.removeEventListener('click', this.sched);
            schedSectButton.addEventListener('click', this.unsched);
            //Add the section to the array of currently scheduled sections
            calSections.push(this);//Push a reference?
            //Save myClasses because this.scheduled has changed
            chrome.storage.local.set({'classes': classes});
            colorClasses();
        }
    }
    //Properly positions the section's divs on calendar according to date/time
    position(){
        //Probably inefficient to get every element with this class name every single time
        var calDay = document.getElementsByClassName("cal-day");
        var timeRect = document.getElementsByClassName("cal-time")[1].getBoundingClientRect();
        var headerRect = document.getElementsByClassName("thead")[0].getBoundingClientRect();

        var timeOffset = ((this.startHours-5)*2+this.startMinutes/30)*7+7;

        for(let i = 0; i<this.daySections.length; i++){
            var dayOffset = 0;
            if(this.daySections[i].day == "M"){
                dayOffset += 1;}
            else if(this.daySections[i].day == "T"){
                dayOffset += 2;}
            else if(this.daySections[i].day == "W"){
                dayOffset += 3;}
            else if(this.daySections[i].day == "H"){
                dayOffset += 4;}
            else if(this.daySections[i].day == "F"){
                dayOffset += 5;}
            var cellRect = calDay[timeOffset+dayOffset].getBoundingClientRect();

            var top = cellRect.y - calDay[7+dayOffset].getBoundingClientRect().y
                +headerRect.height;
            var height = cellRect.height/30
                *((this.endHours-this.startHours)*60
                +this.endMinutes-this.startMinutes);
            
            this.daySections[i].sectionDiv.style.top =
                top.toString() + "px";
            this.daySections[i].sectionDiv.style.height =
                height.toString() + "px";

            this.daySections[i].sectionDiv.style.left = 
                (cellRect.x - timeRect.x).toString() + "px";
            this.daySections[i].sectionDiv.style.width = 
                (0.95*cellRect.width).toString() + "px";
        }
    }
    unschedule(){
        this.scheduled = false;
        //Change the "unschedule section" button in myClasses to "schedule section"
        var schedSectButton = this.sectionDiv.getElementsByClassName("schedSect")[0];
        schedSectButton.innerHTML = "Schedule section";
        schedSectButton.style.color = "black";
        schedSectButton.removeEventListener('click', this.unsched);
        schedSectButton.addEventListener('click', this.sched);
        //Should be updated when calSections[] functionality is updated
        var index = calSections.indexOf(this)
        //Remove the html div for the section from the calendar
        for(let j = 0; j<calSections[index].daySections.length; j++){
            calSections[index].daySections[j].sectionDiv.remove();
        }
        //Remove the section from the array of scheduled sections
        calSections.splice(index, 1);
        //Save myClasses because this.scheduled has changed
        chrome.storage.local.set({'classes': classes});
        colorClasses();
    }
}

function getCourseBin() {
    fetch("https://webreg.usc.edu/Scheduler/Read", {
        method: 'POST'})
    .then(response => response.json())
    .then(data => console.log(data));
}

function searchDept(dept,term){
    document.getElementById("loading").style.display = "block";
    var url = "https://web-app.usc.edu/web/soc/api/classes/"
    + encodeURIComponent(dept) + "/" + encodeURIComponent(term);
    fetch(url)
    .then(response => response.json())
    .then(data => showSearchedCourses(data.OfferedCourses.course, dept));
}

//Searches for a class matching given dept and code, then adds it to myClasses
async function searchAddClass(dept,term,code){
    var url = "https://web-app.usc.edu/web/soc/api/classes/"
    + encodeURIComponent(dept) + "/" + encodeURIComponent(term);
    let response = await fetch(url)
    .then(response => response.json())
    .then(data => {
        for(let i=0; i<data.OfferedCourses.course.length; i++){
            var currentCourse = new Course(data.OfferedCourses.course[i].CourseData);
            if(currentCourse.code == code){
                currentCourse.add();
            }
        };
    })
    return response;
}

function showSearchedCourses(searchedCourseList, dept){
    console.log(searchedCourseList); //For testing

    //Clear search results
    document.getElementById("searchResultsContainer").innerHTML = "";

    for(let i = 0; i<searchedCourseList.length; i++){
        //Check that the course actually belongs in this search
        //(because USC's API will return all courses connected to a department,
        //even if they don't match the prefix
        //i.e. QBIO-401 will show up when searching for BISC courses
        //Webreg's own search only shows courses that match the prefix exactly)
        if(searchedCourseList[i].CourseData.prefix == dept){
            new Course(searchedCourseList[i].CourseData).createHTML(
                document.getElementById("searchResultsContainer"), "search")
        }
    }
    //Hide loading indicator now that search has successfully completed
    document.getElementById("loading").style.display = "none";
}

function addElement(type, className, appendTo, text){
    var element = document.createElement(type);
    if(className != "") {element.className = className;}
    element.appendChild(document.createTextNode(text));
    appendTo.appendChild(element);
    return element;
}

function toggleShow(element){
    if (element.style.display == "block"){
        element.style.display = "none";}
    else {element.style.display = "block";}
}

//Returns the index if the given array contains a class matching the given code, or -1 if not
function containsClass(arr, code){
    for(let i=0; i<arr.length; i++){
        if(arr[i].code == code){
            return i;
        }
    }
    return -1;
}

//Clears all classes from the "my classes" section
function clearClasses(){
    unscheduleAll();
    classes = [];
    chrome.storage.local.set({'classes': classes});
    showMyClasses();
}

//Displays all saved classes in the "my classes" div of the webpage
function showMyClasses(){
    //Clear classes div
    document.getElementById("myClassesContainer").innerHTML = "";
    for(let i=0; i<classes.length; i++){
        classes[i].createHTML(document.getElementById("myClassesContainer"), "myClasses");
    }
}

function unscheduleAll(){
    while(calSections.length>0){
        calSections[0].unschedule();
    }
}

function saveSchedule(name){
    var sections = [];
    for(let i=0;i<calSections.length;i++){
        var section = {};
        section.prefix = calSections[i].prefix;
        section.code = calSections[i].code;
        section.id = calSections[i].id;
        sections.push(section);
    }
    //If there already exists a schedule with that name, overwrite it
    for(let i=0;i<schedules.length;i++){
        if(schedules[i].name==name){
            if(confirm("A saved schedule with that name already exists, overwrite it?")){
                schedules[i].sections = sections;
                chrome.storage.local.set({'schedules': schedules});
                //Displays name of saved schedule in dropdown bar
                document.getElementById("schedinput").value = name;
            }
                return;
        }
    }
    //If a schedule with that name doesn't exist, this will be reached
    //and the new schedule will be pushed
    schedules.push({name: name, sections: sections});
    chrome.storage.local.set({'schedules': schedules});
    //Update schedule list dropdown
    createScheduleList();
}

//Unschedules current schedule and loads the given
//schedule[] where each element has {prefix, code, id}
function loadSchedule(schedule){
    unscheduleAll();
    //Iterate through each section in the schedule
    for(let i=0; i<schedule.sections.length; i++){
        var index = containsClass(classes, schedule.sections[i].code);
        //If the class in the schedule is already in myClasses
        if(index!=-1){
            //Find the matching section id and schedule it
            for(let j=0;j<classes[index].SectionData.length;j++){
                if(classes[index].SectionData[j].id==schedule.sections[i].id){
                    classes[index].SectionData[j].schedule();
                }
            }
        }
        //If not, add the class to myclasses and schedule it
        else{
            //Add class to myclasses
            searchAddClass(schedule.sections[i].prefix, term, schedule.sections[i].code)
            .then(function() {
            //Find the matching section id and schedule it
            for(let j=0;j<classes[classes.length-1].SectionData.length;j++){
                if(classes[classes.length-1].SectionData[j].id==schedule.sections[i].id){
                    classes[classes.length-1].SectionData[j].schedule();
                }
            }})
        }
    }
    //Displays name of loaded schedule in dropdown bar
    document.getElementById("schedinput").value = schedule.name;
}

//Adds listings for each saved schedule to dropdown
function createScheduleList(){
    var dropdown = document.getElementById("scheddropdown");
    dropdown.innerHTML = "";
    for(let i=0;i<schedules.length;i++){
        var listEntry = addElement("li", "", dropdown, schedules[i].name);
        listEntry.addEventListener('click', function () {
            loadSchedule(schedules[i]);
        })
    }
}

function showAllScheduled(){
    for(let i=0; i<classes.length; i++){
        for(let j = 0; j<classes[i].SectionData.length; j++){
            if(classes[i].SectionData[j].scheduled){
                classes[i].SectionData[j].schedule();
            }
        }
    }
}

function setAllSectionPositions(){
    for(let x = 0; x<calSections.length; x++){
        calSections[x].position();
    }
}

//Color each distinct class (not section) on the calendar a different color
function colorClasses(){
    const colors = ["#fcd444","#fc4444","#029658","#2f64c1","#b178aa","#fc6404","#f978aa","#8cc43c","#5bc0de","#1abc9c"];
    //Finds how many distinct classes are scheduled
    schedClasses = [];
    for(let x = 0; x<calSections.length; x++){
        if(!schedClasses.includes(calSections[x].code)){
            schedClasses.push(calSections[x].code);
        }
    }
    //Goes through the scheduled sections and colors them by class
    for(let x = 0; x<calSections.length; x++){
        var index = schedClasses.findIndex(element => element==calSections[x].code);
        for(let n = 0; n<calSections[x].daySections.length; n++){
            calSections[x].daySections[n].sectionDiv.style.background = colors[index];
        }
    }
}

//Listen for changes in webpage zoom, update calendar div positions if needed
function monitorDevicePixelRatio() {
    function onPixelRatioChange() {
        setAllSectionPositions();
        monitorDevicePixelRatio();
    }
    matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    .addEventListener("change", onPixelRatioChange, { once: true });
}
monitorDevicePixelRatio();

//Update calendar div positions on window resize
window.addEventListener("resize", setAllSectionPositions);

chrome.storage.local.set({'term': "20223"})
var term;
var classes = [];
var schedules = [];
chrome.storage.local.get(['term','classes','schedules'], data => {
    term = data.term;
    if (typeof data.classes != "undefined"){
        for(let i = 0; i<data.classes.length; i++){
            classes.push(new Course(data.classes[i]));
        }
    }
    else{classes = []}
    if (typeof data.schedules != "undefined"){
        schedules = data.schedules;
    }
    else{schedules = []};
    showMyClasses();
    createScheduleList();
    showAllScheduled();
});

//Adds search listener to dept search box
var input = document.getElementById("input");
input.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        searchDept(event.target.value.toUpperCase(),term);
    }
});

//Makes it so that clicking the schedules dropdown button shows/hides dropdown
var button = document.getElementById("scheddropdownbutton");
button.addEventListener('click', function () {
    toggleShow(document.getElementById("schedinput").nextElementSibling);
    //Toggles button appearance to either up or down arrow
    if(button.innerHTML=="\\/"){
        button.innerHTML = "/\\";
    }
    else{
        button.innerHTML = "\\/"
    }
})

//Add save schedule functionality to "save schedule" button
//Takes the name of the new schedule from dropdown input box
document.getElementById("savesched").addEventListener('click', function (){
    saveSchedule(document.getElementById("schedinput").value);
})

var calSections = [];