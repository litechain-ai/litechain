import litechain from "../../index";
import dotenv from "dotenv";
dotenv.config();

const client = litechain.llm.openai({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4o-mini",
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
            execute: async (parameters) => {
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
            execute: async (parameters) => {
                return (parameters.a * parameters.b).toString();
            }
        },
    ]
});

const main = async () => {
    client.systemprompt = "You are a helpful assistant that can add, multiply, and get the current time, here's the user query: {USER_QUERY}";
    const response = await client.invoke("hey please help {TEST}", {
        USER_QUERY: "multiply 4 with 5 and add the result with 342 and get the current time",
        TEST: "I am himanshu saini"
    });
    console.log(JSON.stringify(client.state, null, 2));
    console.log(response);
}

main();