const express = require("express");
const fs = require("fs");
const port = 8080;

const app = express();
app.use(express.json());
app.listen(port, listenApp);

// API Routing
app.get("/rooms", getRooms);
app.post("/rooms", addRoom);
app.post("/bookRoom", bookRoom);
app.get("/customers", getCustomerBookings);

function listenApp() {
    // method to listen APP
    console.log("App is running @ port : ", port);
}

function getRooms(req, res) {
    // method to get the list of rooms
    let roomData = fs.readFileSync("./room.json", "utf-8");
    roomData = JSON.parse(roomData);
    let bookingData = fs.readFileSync("./bookings.json", "utf-8");
    bookingData = JSON.parse(bookingData);

    // Adding booking details with room details
    roomData.forEach((room) => {
        room.roomName = "Room - " + room.roomNo;
        room.bookings.forEach((booking, index) => {
            let res = bookingData.filter((item) => item.bookingId === booking);
            room.bookings[index] = res[0];
        });
    });

    res.status(200).json({result: true, data: roomData});
}

function getCustomerBookings(req, res) {
    // Getting customer details from booking data json
    let bookingData = fs.readFileSync("./bookings.json", "utf-8");
    bookingData = JSON.parse(bookingData);

    bookingData.forEach((booking) => {
        booking.roomName = "Room -" + booking.roomId;
    });
    res.status(200).json({result: true, data: bookingData});
}

function addRoom(req, res) {
    // method to create a room
    console.log("Body:", req.body);
    let roomData = fs.readFileSync("./room.json", "utf-8");
    roomData = JSON.parse(roomData);
    // check whether the room already exist or not
    function checkRoomExists(item) {
        console.log("Room no: ", item.roomNo);
        console.log("Room no in Body: ", req.body.roomNo);
        return item.roomNo === req.body.roomNo;
    }
    let roomExists = roomData.filter(checkRoomExists);
    if (roomExists.length === 0) {
        req.body.bookings = [];
        roomData.push(req.body);
        let strRoomData = JSON.stringify(roomData, null, 4);
        fs.writeFile("./room.json", strRoomData, (err) => {
            if (err) {
                res.status(500).json({result: false, message: "Internal server error"});
                console.log(err);
                throw err;
            }
        });
        res.status(200).json({result: true, message: "room added successfully!"});
    } else {
        res.status(409).json({result: false, message: "Room already exists"});
    }
}

function bookRoom(req, res) {
    console.log("Body:", req.body);
    let bookingData = fs.readFileSync("./bookings.json", "utf-8");
    bookingData = JSON.parse(bookingData);
    let roomData = fs.readFileSync("./room.json", "utf-8");
    roomData = JSON.parse(roomData);
    console.log(roomData);
    
    // check whether the user has booked before or after one hour f the start time
    let oneHourChecking = bookingData.some((booking) => {
        if (booking.customerName === req.body.customerName) {
            let ub = new Date(booking.startTime);
            ub = ub.setHours(ub.getHours() + 1);
            // lwb = Date.parse(lwb);
            let lwb = new Date(booking.startTime);
            console.log(lwb);
            lwb = lwb.setHours(lwb.getHours() - 1);
            console.log(lwb);
            // ub = Date.parse(ub);
            let rst = Date.parse(req.body.startTime);
            console.log("Upper Bound: ", ub, "Lower Bound: ", lwb, "Start Time:", rst);

            if (rst <= ub && rst >= lwb) {
                console.log("Conflicting time");
                return true;
            }
        }
        return false;
    });
    if (oneHourChecking) {
        res.status(405).json({
            result: false,
            message: " Start time is less than +1hours or greater than -1 hour to an already " + "available booking of the same user"
        });
        return;
    }

    // check whether a booking exists for the same time line or not
    let bookingExists = bookingData.some((booking) => {
        if (booking.roomId === req.body.roomId) {
            let bst = Date.parse(booking.startTime);
            let bet = Date.parse(booking.endTime);
            let rst = Date.parse(req.body.startTime);
            let ret = Date.parse(req.body.endTime);
            if ((rst <= bet && rst >= bst) || (ret <= bet && ret >= bst) || (ret >= bet && rst <= bst)) {
                console.log("BST:", bst, "BET:", bet, "RST:", rst, "RET:", ret);
                return true;
            }
        }
        return false;
    });
    if (bookingExists) {
        res.status(405).json({result: false, message: "bookings exists for the same time line"});
        return;
    }

    // check whether the room exists
    let roomExists = roomData.some((room) => {
        console.log("room no: ", room.roomNo, "room Id:", req.body.roomId);
        console.log(room.roomNo === req.body.roomId);
        return room.roomNo === req.body.roomId;
    });
    console.log(roomExists);
    if (! roomExists) {
        res.status(404).json({result: false, message: "Room Not found"});
        return;
    }

    req.body.bookingId = bookingData.length + 1;
    bookingData.push(req.body);
    let strBookingData = JSON.stringify(bookingData, null, 4);
    fs.writeFile("./bookings.json", strBookingData, (err) => {
        if (err) {
            res.status(500).json({result: false, message: "Internal server error"});
            console.log(err);
            throw err;
            return;
        }
    });

    roomData.map((room) => {
        if (room.roomNo === req.body.roomId) 
            room.bookings.push(bookingData.length - 1);
        
    });
    let strRoomData = JSON.stringify(roomData, null, 4);
    fs.writeFile("./room.json", strRoomData, (err) => {
        if (err) {
            res.status(500).json({result: false, message: "Internal server error"});
            console.log(err);
            throw err;
            return;
        }
    });
    res.status(200).json({result: true, message: "room booked successfully!"});
}