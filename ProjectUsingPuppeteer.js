const { networkInterfaces } = require('os');
const puppeteer = require('puppeteer');
const fs = require('fs');
const { send, config } = require('process');
const nodemailer = require('nodemailer');
const configuration = require('./configuration.json');


(async () => {
    console.log("Before launching Puppeteer");
    const browser = await puppeteer.launch({ headless: true }); // Launch Puppeteer browser
    console.log("After launching Puppeteer");

    const page = await browser.newPage(); // Create a new page instance

    // Enable network interception and capture performance logs
    await page.setRequestInterception(true);
    page.on('request', request => {
        console.log('Request:', request.url());
        request.continue(); // Allow the request to continue
    });


    page.on('response', async (response) => {
        // Get the URL of the response
        const url = response.url();
            // Get the status code of the response
            const status = response.status();
    
            //prints the response of the entire page
            try {
                // Get the response body as text
                const responseBody = await response.text();

                ////////// Use this when debugging //////////
                // Log the response details
                // console.log('\n\nURL:', url);
                // console.log('\n\nStatus:', status);
                // console.log('\n\nResponse body:', responseBody); 
                ////////////////////////////////////////////

                if (responseBody.startsWith("[{")) {
                    // console.log("Response body contains the date/s:");

                    //public modifiedResponseBody for it to be used in the next block of code
                    modifiedResponseBody = responseBody.substring(1, responseBody.length - 1);
                    // console.log("modifiedResponseBody: ", modifiedResponseBody);

                    // Call the appointmentDates function
                    appointmentDates(modifiedResponseBody);
                }
            } catch (error) {
                console.error('\nError fetching response body:', error);
            }
    });
    

    // Navigate to the website
    await page.goto('https://ais.usvisa-info.com/en-ca/niv/users/sign_in');

    // Fill in email and password fields
    await page.type('#user_email', configuration.credentials.email);
    await page.type('#user_password',configuration.credentials.password);

    console.log("After filling in the email and password fields");

    // Click the "I have read and understood the Privacy Policy and the Terms of Use" checkbox
    await page.click('label[for="policy_confirmed"]');

    // Click the sign-in button
    await page.click('input[type="submit"]');

    // Click the "Schedule Appointment" button
    // Wait for the button to be available
    await page.waitForSelector('.dropdown.menu.align-right.actions');

    // Click on the "Continue" button
    await page.click('.dropdown.menu.align-right.actions .button.primary.small');

    // Click the "Schedule Appointment" button again
    // Wait for the button to be available
    console.log("###############Before clicking the Schedule Appointment button###############");
    await page.goto('https://ais.usvisa-info.com/en-ca/niv/schedule/52561202/appointment');

    // Wait for the dropdown to be available
    await page.waitForSelector('select#appointments_consulate_appointment_facility_id');

    //-----IF CRASHES HERE, THEN Uncomment waitforNetworkIdle function
    // Wait for 3 seconds
    await page.waitForNetworkIdle(3000);

    // Select a city consulate
    await page.select('select#appointments_consulate_appointment_facility_id', configuration.appointment.id);
    console.log('City selected!');

    await page.waitForSelector("#appointment-form > div.text-right > fieldset > ol > a")


    // Close the browser
    await browser.close();

    

})();

function appointmentDates(args) {

    let rawdates = JSON.parse("[" + args + "]");

    // console.log("rawdates: ", rawdates); // Use this when debugging

    // Get the dates
    const dates = rawdates.map((date) => new Date(date.date));
    console.log("dates: ", dates); // Use this when debugging

    // if any date is earlier than a certain date, then send an email to the user
    const thatcertainDate = new Date(configuration.appointment.certainDate);
    let emailSent = false;
    // Find the earliest date
    const earliestDate = dates.reduce((earliest, current) => 
    {
        // If current date is earlier than the earliest found so far, update earliest
        if (current < earliest) {
            return current;
        }
        // Otherwise, keep the current earliest date
        return earliest;
    }, dates[0]); // Start with the first date as the initial value

    // Log the earliest date
    console.log("The earliest date found is:", earliestDate);

    if (earliestDate < thatcertainDate && emailSent == false) {
            console.log("The date", earliestDate, "is earlier than the certain date", thatcertainDate); // Use this when debugging
            // Call the sendEmail function here if you want to send email for each date
            sendEmail(earliestDate);
            emailSent = true;
        }
        else {
            console.log("No dates available yet!");
            console.log("The appoitnment date is: ", thatcertainDate);
        }
}

function sendEmail(date) {
    console.log("Sending email...");
    

    let transporter = nodemailer.createTransport({
        service: 'hotmail',
        auth: {
            user: 'krupal1502patel@hotmail.com',
            pass: 'Bholu@1743'
        }
    });
    
    // Setup email data
    let mailOptions = {
        from: 'krupal1502patel@hotmail.com',
        to: 'krupal1502patel@hotmail.com',
        subject: 'New US-VISA appointment dates available!',
        text: 'Madarchod date mali gai jaldi khol ne lai le!!! Bhosdina!!! \n' + date,
    };
    
    // Send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent', info.messageId);
    });


}
