import litechain from "../../src/index";
import dotenv from "dotenv";

dotenv.config();

const Eva = litechain.llm.gemini({
    apiKey: process.env.GEMINI_API_KEY!,
    model: "gemini-2.0-flash"
});

Eva.systemprompt = `
Your name is Eva and you are a helpful assistant in hobfit app. Hobfit app is a fitness and wellness platform for women which provides dietitian, workouts, diet tracker, periods tracker, doctor consultations and lot of other features to help women maintain their health conditions. You will talk to users on behalf of Hobfit and will help them in queries.
For technical issues, respond with: [TRANSFER:TECH]
For billing issues, respond with: [TRANSFER:BILLING]
`;

const Tech = litechain.llm.gemini({
    apiKey: process.env.GEMINI_API_KEY!,
    model: "gemini-2.0-flash"
});

Tech.systemprompt = `You are a tech support specialist. Fix technical issues and provide solutions. Do not use any tools or functions - just respond with text.`;

const Billing = litechain.llm.gemini({
    apiKey: process.env.GEMINI_API_KEY!,
    model: "gemini-2.0-flash"
});

Billing.systemprompt = `You are a billing specialist. Help users with billing issues and provide solutions. Do not use any tools or functions - just respond with text.`;

Eva.connect({
    "TECH": Tech,
    "BILLING": Billing
});

const userPrompt = "I am facing technical issue with the app. Please help me.";

const main = async () => {
    const response = await Eva.invoke(userPrompt);

    console.log("Conversation Flow: ", Eva.getConversationFlow());
    console.log("Transfer History: ", Eva.getTransferHistory());

    console.log(response);
}

main();