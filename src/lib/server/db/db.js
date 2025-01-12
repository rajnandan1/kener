// @ts-nocheck
import Sqlite from "./sqlite.js";
import knexOb from "../../../../knexfile.js";

let instance = new Sqlite(knexOb);
export default instance;
