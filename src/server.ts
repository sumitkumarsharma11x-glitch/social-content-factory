import express from "express";
import path from "node:path";
import { openDatabase } from "./db";
import { registerGenerateBatchRoute } from "./generate-batch-route";
import { registerReviewDashboardRoutes } from "./review-dashboard-route";
import { registerVideoFactoryRoutes } from "./video-factory-route";
import { registerVideoRenderRoutes } from "./video-render-route";
const PORT=Number(process.env.PORT)||3000;
const DB_PATH=process.env.DB_PATH||"./social-content-factory.sqlite3";
export function createApp(){const app=express();app.use(express.json());const publicDir=path.resolve(__dirname,"../public");app.use(express.static(publicDir));const db=openDatabase(DB_PATH);registerGenerateBatchRoute(app,db);registerReviewDashboardRoutes(app,db);registerVideoFactoryRoutes(app,db);registerVideoRenderRoutes(app,db,path.join(publicDir,"videos"));app.get("/health",(_req,res)=>res.json({ok:true}));app.get("/",(_req,res)=>res.sendFile(path.join(publicDir,"index.html")));return app;}
if(require.main===module){const app=createApp();app.listen(PORT,()=>{console.log(`Social Content Factory API listening on http://localhost:${PORT}`);});}
