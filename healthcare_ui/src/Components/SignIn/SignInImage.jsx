import React from "react";
import loginImage from "../../Assets/Images/Login Image.png";

const SignInImage = () => {
	return (
		<div className="col-lg-6 d-none d-lg-flex align-items-center border-light rounded-5">
			<img
				src={loginImage}
				alt="Login"
				className="img-fluid w-100 h-100 rounded-5 px-xl-2"
				style={{ objectFit: "contain", maxHeight: "100vh" }}
			/>
		</div>
	);
};

export default SignInImage;
