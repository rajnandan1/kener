// @ts-nocheck
import DbImpl from "./dbimpl.js";
import knexOb from "../../../../knexfile.js";

let instance = new DbImpl(knexOb);
export default instance;
