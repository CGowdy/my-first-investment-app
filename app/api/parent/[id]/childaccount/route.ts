import {Collection, findMany} from "@mongoDataApiHelper";

export const revalidate = 0

export const GET = async(req: Request, {params}: {params:Promise<{id:string}>}) =>{
    try{
        const {id} = await params;
        const childAccountResponse = await findMany<any[]>(Collection.ChildAccounts,{parentId: id});
        if(!childAccountResponse) return Response.json([]);
        const accounts = childAccountResponse.documents;
        return Response.json(accounts);
    }catch (error){
        return new Response(null,{
            status:500,
            statusText:`Server error: ${error}`
        });
    }
}
