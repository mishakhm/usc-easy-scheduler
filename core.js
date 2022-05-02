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
            //Create div for all info for a single course
            var searchedCourse = document.createElement("div");
            searchedCourse.className = "searchResult";

            //Find how many units the course is worth
            var units = "0.0";
            for(let j = 0; j<searchedCourseList[i].CourseData.SectionData.length; j++){
                if(parseFloat(searchedCourseList[i].CourseData.SectionData[j].units) > parseFloat(units)){
                    units = searchedCourseList[i].CourseData.SectionData[j].units;
                }
            }

            //Create button with outer info
            button = addElement("button", "searchResultButton", searchedCourse, "");
            addElement("p", "", button, 
            searchedCourseList[i].CourseData.prefix
            + "-" + searchedCourseList[i].CourseData.number
            + ": " + searchedCourseList[i].CourseData.title);
            addElement("p", "", button, "Units: " + units);
            
            //Add course info
            var searchedCourseInfo = document.createElement("div");
            searchedCourseInfo.className = "searchedCourseInfo";
            //Add pre-req and co-req info
            if (typeof searchedCourseList[i].CourseData.prereq_text == "string"){
                addElement("div", "", searchedCourseInfo,
                "Pre-reqs: " + searchedCourseList[i].CourseData.prereq_text)}
            if (typeof searchedCourseList[i].CourseData.coreq_text == "string"){
                addElement("div", "", searchedCourseInfo,
                "Co-reqs: " + searchedCourseList[i].CourseData.coreq_text)}
            //Add all course sections to info
            for(let j = 0; j<searchedCourseList[i].CourseData.SectionData.length; j++){
                var section = document.createElement("div");
                section.className = "searchSection";
                
                addElement("p", "", section, 
                searchedCourseList[i].CourseData.SectionData[j].id
                + " " + searchedCourseList[i].CourseData.SectionData[j].dclass_code
                + ": " + searchedCourseList[i].CourseData.SectionData[j].type);

                addElement("p", "", section, 
                searchedCourseList[i].CourseData.SectionData[j].day
                + " " + searchedCourseList[i].CourseData.SectionData[j].start_time
                + "-" + searchedCourseList[i].CourseData.SectionData[j].end_time);

                //Check if an instructor is listed for the course, and either display their name or a message
                if (typeof searchedCourseList[i].CourseData.SectionData[j].instructor != "undefined"){
                    if(Array.isArray(searchedCourseList[i].CourseData.SectionData[j].instructor)){
                        for(let k = 0; k<searchedCourseList[i].CourseData.SectionData[j].instructor.length;k++){
                            addElement("p", "", section, 
                            searchedCourseList[i].CourseData.SectionData[j].instructor[k].last_name
                            + ", " + searchedCourseList[i].CourseData.SectionData[j].instructor[k].first_name);}
                    }
                    else{
                        addElement("p", "", section, 
                        searchedCourseList[i].CourseData.SectionData[j].instructor.last_name
                        + ", " + searchedCourseList[i].CourseData.SectionData[j].instructor.first_name);}}
                else{addElement("p", "", section, "No instructor listed");}

                addElement("p", "", section, 
                searchedCourseList[i].CourseData.SectionData[j].number_registered
                + "/" + searchedCourseList[i].CourseData.SectionData[j].spaces_available);

                searchedCourseInfo.appendChild(section);
            }
            searchedCourse.appendChild(searchedCourseInfo);
            //Add the whole course div to the results
            document.getElementById("searchResultsContainer").appendChild(searchedCourse);
        }
    }
    //Accordion dropdown function for revealing section info
    var accordion = document.getElementsByClassName("searchResultButton");
    for (i=0; i<accordion.length; i++) {
        accordion[i].addEventListener('click', function () {
            toggleShow(this.nextElementSibling);})
    }
    //Hide loading indicator now that search has successfully completed
    document.getElementById("loading").style.display = "none";
}

function toggleShow(element){
    if (element.style.display == "block"){
        element.style.display = "none";}
    else {element.style.display = "block";}
}


var term = "20223";

//Adds search listener to dept search box
var input = document.getElementById("input");
input.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      searchDept(event.target.value.toUpperCase(),term);
    }
  });