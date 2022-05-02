class course {
    constructor(dept, number, title){
        this.dept = dept;
        this.number = number;
        this.title = title;
        //this.units = units;
        this.sections = [];
    }
}

class section {
    constructor(id, day, start_time, end_time, numRegistered, spaces, type){
        this.id = id;
        this.day = day;
        this.start_time = start_time;
        this.end_time = end_time;
        this.numRegistered = numRegistered;
        this.spaces = spaces;
        this.type = type;
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

function addElement(type, className, appendTo, text){
    var element = document.createElement(type);
    if(className != "") {element.className = className;}
    element.appendChild(document.createTextNode(text));
    appendTo.appendChild(element);
    return element;
}

function showSearchedCourses(searchedCourseList, dept){
    console.log(searchedCourseList); //For testing

    //Clear search results
    document.getElementById("searchResultsContainer").innerHTML = "";

    for(let i = 0; i<searchedCourseList.length; i++){
        //Check that the course actually belongs in this search (because USC's API will return all courses connected to a department even if they don't match the prefix, i.e. QBIO-401 will show up when searching for BISC courses. Webreg's own search only shows courses that match the prefix exactly)
        if(searchedCourseList[i].CourseData.prefix == dept){
            createClassHTML(searchedCourseList[i], document.getElementById("searchResultsContainer"), "search");
        }
    }
    //Hide loading indicator now that search has successfully completed
    document.getElementById("loading").style.display = "none";
}

function createClassHTML(course, addTo, type){
    //Create div for all info for a single course
    var displayCourse = document.createElement("div");
    displayCourse.className = "searchResult";

    //Find how many units the course is worth
    var units = "0.0";
    for(let j = 0; j<course.CourseData.SectionData.length; j++){
        if(parseFloat(course.CourseData.SectionData[j].units) > parseFloat(units)){
            units = course.CourseData.SectionData[j].units;
        }
    }

    //Create button with outer info
    button = addElement("button", "searchResultButton", displayCourse, "");
    addElement("p", "", button, 
    course.CourseData.prefix
    + "-" + course.CourseData.number
    + ": " + course.CourseData.title);
    addElement("p", "", button, "Units: " + units);
    
    //Add course info
    var displayCourseInfo = document.createElement("div");
    displayCourseInfo.className = "displayCourseInfo";
    //"Add class" button if in search
    if (type == "search"){
        addClassButton = addElement("button", "addClass", displayCourseInfo, "Add class to my list");
        addClassButton.addEventListener('click', function () {
            addClass(course);
        });}
    //Add pre-req and co-req info
    if (typeof course.CourseData.prereq_text == "string"){
        addElement("div", "", displayCourseInfo,
        "Pre-reqs: " + course.CourseData.prereq_text)}
    if (typeof course.CourseData.coreq_text == "string"){
        addElement("div", "", displayCourseInfo,
        "Co-reqs: " + course.CourseData.coreq_text)}
    //Add all course sections to info
    for(let j = 0; j<course.CourseData.SectionData.length; j++){
        var section = document.createElement("div");
        section.className = "searchSection";
        
        addElement("p", "", section, 
        course.CourseData.SectionData[j].id
        + " " + course.CourseData.SectionData[j].dclass_code
        + ": " + course.CourseData.SectionData[j].type);

        addElement("p", "", section, 
        course.CourseData.SectionData[j].day
        + " " + course.CourseData.SectionData[j].start_time
        + "-" + course.CourseData.SectionData[j].end_time);

        //Check if an instructor is listed for the course, and either display their name or a message
        if (typeof course.CourseData.SectionData[j].instructor != "undefined"){
            if(Array.isArray(course.CourseData.SectionData[j].instructor)){
                for(let k = 0; k<course.CourseData.SectionData[j].instructor.length;k++){
                    addElement("p", "", section, 
                    course.CourseData.SectionData[j].instructor[k].last_name
                    + ", " + course.CourseData.SectionData[j].instructor[k].first_name);}
            }
            else{
                addElement("p", "", section, 
                course.CourseData.SectionData[j].instructor.last_name
                + ", " + course.CourseData.SectionData[j].instructor.first_name);}}
        else{addElement("p", "", section, "No instructor listed");}

        addElement("p", "", section, 
        course.CourseData.SectionData[j].number_registered
        + "/" + course.CourseData.SectionData[j].spaces_available);

        displayCourseInfo.appendChild(section);
    }
    displayCourse.appendChild(displayCourseInfo);
    //Add the whole course div to the results
    addTo.appendChild(displayCourse);
    //Add accordion dropdown functionality
    button.addEventListener('click', function () {
        toggleShow(this.nextElementSibling);})
}

function toggleShow(element){
    if (element.style.display == "block"){
        element.style.display = "none";}
    else {element.style.display = "block";}
}

function addClass(course){
    //Need to add a check that the course isn't already in list
    classes.push(course);
    //Save updated list of classes - using storage.sync currently exceeds QUOTA_BYTES_PER_ITEM but would eventually be ideal
    chrome.storage.local.set({'classes': classes});
    //Show updated list of classes
    showMyClasses();
}

function clearClasses(){
    classes = [];
    chrome.storage.local.set({'classes': classes});
    showMyClasses();
}

function showMyClasses(){
    //Clear classes div
    document.getElementById("myClassesContainer").innerHTML = "";
    for(i=0; i<classes.length; i++){
        createClassHTML(classes[i], document.getElementById("myClassesContainer"), "myClasses");
    }
}

//chrome.storage.local.set({'term': "20223"})
var term;
var classes;
chrome.storage.local.get(['term','classes'], data => {
    term = data.term;
    if (typeof data.classes != "undefined"){classes = data.classes}
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