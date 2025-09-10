let roomId;

function go_to_part2() {
    // hide the part 1 section
    document.getElementById('generate').style.display = 'none';
    // change the h2 title
    document.getElementById('page-title').innerText = 'New Room part 2';
    // show the part 2 section
    document.getElementById('accept').style.display = 'block';
}