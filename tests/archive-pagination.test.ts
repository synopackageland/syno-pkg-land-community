// @vitest-environment node
import { expect, it } from 'vitest';
import { collectPages } from '../.github/lib/pagination';
it('collects all pages beyond the first 100 comments or replies', async () => {
 const pages = [{ nodes: Array.from({length:100}, (_,i)=>i), pageInfo:{hasNextPage:true,endCursor:'next'} }, { nodes:[100,101],pageInfo:{hasNextPage:false,endCursor:null} }];
 let n=0;
 const result=await collectPages(async (cursor) => { expect(cursor).toBe(n===0?null:'next'); return pages[n++]; });
 expect(result).toHaveLength(102);
});
it('refuses a broken pagination cursor instead of silently truncating', async () => {
 await expect(collectPages(async()=>({nodes:[],pageInfo:{hasNextPage:true,endCursor:null}}))).rejects.toThrow(/cursor/);
});
