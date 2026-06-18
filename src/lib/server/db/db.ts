import DbImpl from "./dbimpl";
import knexOb, { workerKnexOb } from "../../../../knexfile.js";

const instance: DbImpl = new DbImpl(knexOb, workerKnexOb);
export default instance;
