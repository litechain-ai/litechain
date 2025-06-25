import litechain from "../../src/index";
import dotenv from "dotenv";
dotenv.config();

const client = litechain.llm.groq({
    apiKey: process.env.GROQ_API_KEY!,
    model: "deepseek-r1-distill-llama-70b",
    tools: [
        {
            description: "Add two numbers",
            name: "add",
            parameters: {
                a: {
                    type: "number",
                    description: "The first number"
                },
                b: {
                    type: "number",
                    description: "The second number"
                }
            },
            execute: async (parameters: { a: number, b: number }) => {
                return (parameters.a + parameters.b).toString();
            }
        },
        {
            description: "Get the current time",
            name: "get_time",
            parameters: {},
            execute: async () => {
                return new Date().toISOString();
            }
        },
        {
            description: "Multiply two numbers",
            name: "multiply",
            parameters: {
                a: {
                    type: "number",
                    description: "The first number"
                },
                b: {
                    type: "number",
                    description: "The second number"
                }
            },
            execute: async (parameters: { a: number, b: number }) => {
                return (parameters.a * parameters.b).toString();
            }
        },
    ]
});

const main = async () => {

    const response = await client.invoke("multiply 4 with 5 and add the result with 342 and get the current time in human format?");
    console.log(JSON.stringify(client.state, null, 2));
    console.log(response);
}

main();