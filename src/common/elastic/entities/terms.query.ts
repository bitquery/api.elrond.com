import { AbstractQuery } from "./abstract.query";

export class TermsQuery extends AbstractQuery {
  constructor(
    private readonly key: string,
    private readonly value: string[],
    private readonly terms_field: boolean = false 
  ) {
    super();
  }

  getQuery(): any {
    if (this.terms_field) {
      return {
        "terms": {
          [this.key]: this.value,
        }
      }
    }

    return {
      [this.key]: this.value,
    };
  }
}
