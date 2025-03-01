<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);


header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}


$host = "localhost"; 
$dbname = "handsconnect"; 
$user = "root"; 
$pass = ""; 

$conn = new mysqli($host, $user, $pass, $dbname);
if ($conn->connect_error) {
    echo json_encode(["status" => "fail", "message" => "Database connection failed: " . $conn->connect_error]);
    exit();
}


if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (!isset($_POST['role'], $_POST['full_name'], $_POST['email'], $_POST['password'])) {
        echo json_encode(["status" => "fail", "message" => "Missing required fields"]);
        exit();
    }
 $role = $conn->real_escape_string($_POST['role']);
    $fullName = $conn->real_escape_string($_POST['full_name']);
    $email = $conn->real_escape_string($_POST['email']);
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
    $verificationCode = rand(100000, 999999);

    if ($role === "volunteer") {
        $dob = $conn->real_escape_string($_POST['dob'] ?? '');
        $location = $conn->real_escape_string($_POST['location'] ?? '');
        $skills = $conn->real_escape_string($_POST['skills'] ?? '');
        $reason = $conn->real_escape_string($_POST['reason'] ?? '');
        // $profilePic = $conn->real_escape_string($_POST['profile_picture'] ?? '');

        $stmt = $conn->prepare("INSERT INTO Volunteers (full_name, email, password, date_of_birth, location, skills, reason, profile_picture, verification_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssssss", $fullName, $email, $password, $dob, $location, $skills, $reason, $profilePic, $verificationCode);
    } elseif ($role === "ngo") {
        $ngoName = $conn->real_escape_string($_POST['ngo_name'] ?? '');
        $ngoDescription = $conn->real_escape_string($_POST['ngo_description'] ?? '');
        $website = $conn->real_escape_string($_POST['ngo_website'] ?? '');
        $ngoLocation = $conn->real_escape_string($_POST['ngo_location'] ?? '');
        // $logo = $conn->real_escape_string($_POST['ngo_logo'] ?? '');

        $stmt = $conn->prepare("INSERT INTO ngo_representatives (full_name, ngo_name, ngo_email, password, ngo_description, website, location, ngo_logo, verification_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssssss", $fullName, $ngoName, $email, $password, $ngoDescription, $website, $ngoLocation, $logo, $verificationCode);
    } else {
        echo json_encode(["status" => "fail", "message" => "Invalid role"]);
        exit();
    }


    if ($stmt->execute()) {
        $response = [
            "status" => "success",
            "message" => "Hello $fullName, your email is $email. A verification email will be sent."
        ];
    } else {
        $response = [
            "status" => "fail",
            "message" => "Database error: " . $stmt->error
        ];
    }


    $stmt->close();
    $conn->close();

    echo json_encode($response);
}
?>
