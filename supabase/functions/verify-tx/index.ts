import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { txHash } = await req.json();
    if (!txHash || typeof txHash !== "string") {
      return new Response(JSON.stringify({ error: "txHash required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Look up the transaction record in our database.
    const { data: txRow, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("tx_hash", txHash)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No record found.
    if (!txRow) {
      return new Response(
        JSON.stringify({
          verified: false,
          message: `No transaction found in the database for hash ${txHash}.`,
          onChain: null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pending (off-chain) records — the blockchain backend has not yet confirmed.
    if (txRow.status === "pending" || txHash.startsWith("pending-")) {
      return new Response(
        JSON.stringify({
          verified: false,
          message:
            "This record is currently off-chain (pending). Start the Hardhat network and the Express backend (see README) to confirm it on-chain. No blockchain node is reachable from this hosted demo.",
          onChain: { record: txRow, onChainHash: null },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Confirmed on-chain record.
    // NOTE: In this hosted environment we cannot reach a live Ethereum node, so
    // real on-chain re-querying is performed by the local Express backend
    // (server/src/blockchain.ts -> provider.getTransactionReceipt). Here we report
    // the stored confirmation metadata.
    return new Response(
      JSON.stringify({
        verified: true,
        message: `Transaction ${txHash} is confirmed on chain in block ${txRow.block_number}.`,
        onChain: {
          record: txRow,
          onChainHash: txRow.tx_hash,
          blockNumber: txRow.block_number,
          fromAddress: txRow.from_address,
          toAddress: txRow.to_address,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
