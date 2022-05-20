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
                this.SectionData.push(new Section(CourseData.SectionData[i], this.code));
            }}
            else{
                this.units = CourseData.SectionData.units;
                this.SectionData.push(new Section(CourseData.SectionData, this.code));
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
    //Returns true if a given array contains this course
    containedIn(arr){
        for(let i=0; i<arr.length; i++){
            if(arr[i].code == this.code){
                return true;
            }
        }
        return false;
    }
    add(){
        if(!this.containedIn(classes)) {
            classes.push(this);}
        //Save updated list of classes
        //storage.sync currently exceeds QUOTA_BYTES_PER_ITEM but may be ideal
        chrome.storage.local.set({'classes': classes});
        //Show updated list of classes
        showMyClasses();
    }
}

class Section {
    constructor(SectionData, code){
        this.code = code;
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
    }
    createHTML(addTo, type){
        var sectionDiv = document.createElement("div");
        sectionDiv.className = "searchSection";
        
        addElement("p", "", sectionDiv, this.id + " "
        + this.dclass_code + ": " + this.type);


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
            schedSectButton.addEventListener('click', () =>
                this.schedule()
            );}

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
            this.position();
            calSections.push(this);//Push a reference?
            chrome.storage.local.set({'classes': classes});
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
        //Should be updated when calSections[] functionality is updated
        var index = calSections.indexOf(this)
        for(let j = 0; j<calSections[index].daySections.length; j++){
            calSections[index].daySections[j].sectionDiv.remove();
        }
        calSections.splice(index, 1);
        chrome.storage.local.set({'classes': classes});
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

//Clears all classes from the "my classes" section
function clearClasses(){
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
    showAllScheduled();
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
chrome.storage.local.get(['term','classes'], data => {
    term = data.term;
    if (typeof data.classes != "undefined"){
        for(let i = 0; i<data.classes.length; i++){
            classes.push(new Course(data.classes[i]));
        }
    }
    else{classes = []}
    showMyClasses();
});

//Adds search listener to dept search box
var input = document.getElementById("input");
input.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        searchDept(event.target.value.toUpperCase(),term);
    }
});

var calSections = [];