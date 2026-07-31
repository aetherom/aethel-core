export default {
    async fetch(request, env, ctx) {
        return new Response("Aethel Core is running.", { status: 200 });
    },
};
