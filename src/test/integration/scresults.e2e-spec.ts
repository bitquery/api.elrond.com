import { SmartContractResultService } from "../../endpoints/sc-results/scresult.service";
import { Test } from "@nestjs/testing";
import { SmartContractResultFilter } from "../../endpoints/sc-results/entities/smart.contract.result.filter";
import { SmartContractResult } from "../../endpoints/sc-results/entities/smart.contract.result";
import '../../utils/extensions/jest.extensions';
import { PublicAppModule } from "src/public.app.module";

describe('Scresults Service', () => {
  let scResultsService: SmartContractResultService;
  let accountAddress: string;
  let scHash: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PublicAppModule],
    }).compile();

    scResultsService = moduleRef.get<SmartContractResultService>(SmartContractResultService);

    const scResults = await scResultsService.getScResults({ from: 0, size: 1 }, new SmartContractResultFilter());
    expect(scResults).toHaveLength(1);

    const scResult = scResults[0];
    accountAddress = scResult.sender;
    scHash = scResults[0].hash;
  });

  describe('Scresults list', () => {
    it('scresults should have hash, nonce and timestamp', async () => {
      const scResultFilter = new SmartContractResultFilter();
      scResultFilter.originalTxHashes = ['f01660479c8481a1c07e78508898130e45dc8657bf2fc5c2f377623eb18f734d'];

      const results = await scResultsService.getScResults({ from: 0, size: 1 }, new SmartContractResultFilter());

      for (const result of results) {
        expect(result).toHaveStructure(Object.keys(new SmartContractResult()));
      }
    });

    it(`should return a list with 25 scresults`, async () => {
      const results = await scResultsService.getScResults({ from: 0, size: 25 }, new SmartContractResultFilter());

      expect(results).toHaveLength(25);

      for (const result of results) {
        expect(result).toHaveStructure(Object.keys(new SmartContractResult()));
      }
    });

    it(`should return a list with 50 scresults`, async () => {
      const results = await scResultsService.getScResults({ from: 0, size: 50 }, new SmartContractResultFilter());

      expect(results).toHaveLength(50);

      for (const result of results) {
        expect(result).toHaveStructure(Object.keys(new SmartContractResult()));
      }
    });
  });

  describe('Scresults filters', () => {
    it(`should return a list of scresults for an account`, async () => {
      const results = await scResultsService.getAccountScResults(accountAddress, { from: 0, size: 25 });
      expect(results).toBeInstanceOf(Array);

      for (const result of results) {
        expect(result).toHaveStructure(Object.keys(new SmartContractResult()));
        expect([result.sender, result.receiver]).toContain(accountAddress);
      }
    });
  });

  describe('Scresults count', () => {
    it(`should return smart contract count`, async () => {
      const count = await scResultsService.getScResultsCount();
      expect(typeof count).toBe('number');
    });
  });

  describe('Scresult Details', () => {
    it(`should return a detailed scresult with hash`, async () => {
      const result = await scResultsService.getScResult(scHash);
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Object);
      expect(result?.hash).toStrictEqual(scHash);
    });

    it(`should throw 'Smart contract result not found' error`, async () => {
      const scResult = await scResultsService.getScResult(scHash + 'a');
      expect(scResult).toBeUndefined();
    });
  });

  describe('Get Results of a smart contract count', () => {
    it('should return sc results count', async () => {
      const count = await scResultsService.getAccountScResultsCount(accountAddress);
      expect(typeof count).toBe('number');
    });
  });
});
