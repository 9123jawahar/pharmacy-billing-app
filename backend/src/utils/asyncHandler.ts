import type { NextFunction, Request, Response } from "express";

type Handler<Req extends Request> = (req: Req, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async route handler so rejected promises reach the error middleware.
 * Generic over the request type so route-specific typings (e.g.
 * `Request<{ id: string }, unknown, UpdateDrugInput>`) flow through untouched
 * instead of being widened to the default `Request<ParamsDictionary>`.
 */
export const asyncHandler =
  <Req extends Request = Request>(handler: Handler<Req>) =>
  (req: Req, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
