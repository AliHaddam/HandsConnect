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

}
?>