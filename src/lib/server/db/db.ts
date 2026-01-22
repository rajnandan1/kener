import DbImpl from "./dbimpl";
import knexOb from "../../../../knexfile.js";

const instance: DbImpl = new DbImpl(knexOb);
export default instance;
