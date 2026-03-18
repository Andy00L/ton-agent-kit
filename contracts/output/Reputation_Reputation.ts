import {
    Cell,
    Slice,
    Address,
    Builder,
    beginCell,
    ComputeError,
    TupleItem,
    TupleReader,
    Dictionary,
    contractAddress,
    address,
    ContractProvider,
    Sender,
    Contract,
    ContractABI,
    ABIType,
    ABIGetter,
    ABIReceiver,
    TupleBuilder,
    DictionaryValue
} from '@ton/core';

export type DataSize = {
    $$type: 'DataSize';
    cells: bigint;
    bits: bigint;
    refs: bigint;
}

export function storeDataSize(src: DataSize) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.cells, 257);
        b_0.storeInt(src.bits, 257);
        b_0.storeInt(src.refs, 257);
    };
}

export function loadDataSize(slice: Slice) {
    const sc_0 = slice;
    const _cells = sc_0.loadIntBig(257);
    const _bits = sc_0.loadIntBig(257);
    const _refs = sc_0.loadIntBig(257);
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadGetterTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function storeTupleDataSize(source: DataSize) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.cells);
    builder.writeNumber(source.bits);
    builder.writeNumber(source.refs);
    return builder.build();
}

export function dictValueParserDataSize(): DictionaryValue<DataSize> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDataSize(src)).endCell());
        },
        parse: (src) => {
            return loadDataSize(src.loadRef().beginParse());
        }
    }
}

export type SignedBundle = {
    $$type: 'SignedBundle';
    signature: Buffer;
    signedData: Slice;
}

export function storeSignedBundle(src: SignedBundle) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBuffer(src.signature);
        b_0.storeBuilder(src.signedData.asBuilder());
    };
}

export function loadSignedBundle(slice: Slice) {
    const sc_0 = slice;
    const _signature = sc_0.loadBuffer(64);
    const _signedData = sc_0;
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadGetterTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function storeTupleSignedBundle(source: SignedBundle) {
    const builder = new TupleBuilder();
    builder.writeBuffer(source.signature);
    builder.writeSlice(source.signedData.asCell());
    return builder.build();
}

export function dictValueParserSignedBundle(): DictionaryValue<SignedBundle> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSignedBundle(src)).endCell());
        },
        parse: (src) => {
            return loadSignedBundle(src.loadRef().beginParse());
        }
    }
}

export type StateInit = {
    $$type: 'StateInit';
    code: Cell;
    data: Cell;
}

export function storeStateInit(src: StateInit) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeRef(src.code);
        b_0.storeRef(src.data);
    };
}

export function loadStateInit(slice: Slice) {
    const sc_0 = slice;
    const _code = sc_0.loadRef();
    const _data = sc_0.loadRef();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadGetterTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function storeTupleStateInit(source: StateInit) {
    const builder = new TupleBuilder();
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

export function dictValueParserStateInit(): DictionaryValue<StateInit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStateInit(src)).endCell());
        },
        parse: (src) => {
            return loadStateInit(src.loadRef().beginParse());
        }
    }
}

export type Context = {
    $$type: 'Context';
    bounceable: boolean;
    sender: Address;
    value: bigint;
    raw: Slice;
}

export function storeContext(src: Context) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBit(src.bounceable);
        b_0.storeAddress(src.sender);
        b_0.storeInt(src.value, 257);
        b_0.storeRef(src.raw.asCell());
    };
}

export function loadContext(slice: Slice) {
    const sc_0 = slice;
    const _bounceable = sc_0.loadBit();
    const _sender = sc_0.loadAddress();
    const _value = sc_0.loadIntBig(257);
    const _raw = sc_0.loadRef().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadGetterTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function storeTupleContext(source: Context) {
    const builder = new TupleBuilder();
    builder.writeBoolean(source.bounceable);
    builder.writeAddress(source.sender);
    builder.writeNumber(source.value);
    builder.writeSlice(source.raw.asCell());
    return builder.build();
}

export function dictValueParserContext(): DictionaryValue<Context> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeContext(src)).endCell());
        },
        parse: (src) => {
            return loadContext(src.loadRef().beginParse());
        }
    }
}

export type SendParameters = {
    $$type: 'SendParameters';
    mode: bigint;
    body: Cell | null;
    code: Cell | null;
    data: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeSendParameters(src: SendParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        if (src.code !== null && src.code !== undefined) { b_0.storeBit(true).storeRef(src.code); } else { b_0.storeBit(false); }
        if (src.data !== null && src.data !== undefined) { b_0.storeBit(true).storeRef(src.data); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadSendParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _code = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _data = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleSendParameters(source: SendParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserSendParameters(): DictionaryValue<SendParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSendParameters(src)).endCell());
        },
        parse: (src) => {
            return loadSendParameters(src.loadRef().beginParse());
        }
    }
}

export type MessageParameters = {
    $$type: 'MessageParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeMessageParameters(src: MessageParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadMessageParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleMessageParameters(source: MessageParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserMessageParameters(): DictionaryValue<MessageParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMessageParameters(src)).endCell());
        },
        parse: (src) => {
            return loadMessageParameters(src.loadRef().beginParse());
        }
    }
}

export type DeployParameters = {
    $$type: 'DeployParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    bounce: boolean;
    init: StateInit;
}

export function storeDeployParameters(src: DeployParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeBit(src.bounce);
        b_0.store(storeStateInit(src.init));
    };
}

export function loadDeployParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _bounce = sc_0.loadBit();
    const _init = loadStateInit(sc_0);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadGetterTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadGetterTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function storeTupleDeployParameters(source: DeployParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeBoolean(source.bounce);
    builder.writeTuple(storeTupleStateInit(source.init));
    return builder.build();
}

export function dictValueParserDeployParameters(): DictionaryValue<DeployParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployParameters(src)).endCell());
        },
        parse: (src) => {
            return loadDeployParameters(src.loadRef().beginParse());
        }
    }
}

export type StdAddress = {
    $$type: 'StdAddress';
    workchain: bigint;
    address: bigint;
}

export function storeStdAddress(src: StdAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 8);
        b_0.storeUint(src.address, 256);
    };
}

export function loadStdAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(8);
    const _address = sc_0.loadUintBig(256);
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleStdAddress(source: StdAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeNumber(source.address);
    return builder.build();
}

export function dictValueParserStdAddress(): DictionaryValue<StdAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStdAddress(src)).endCell());
        },
        parse: (src) => {
            return loadStdAddress(src.loadRef().beginParse());
        }
    }
}

export type VarAddress = {
    $$type: 'VarAddress';
    workchain: bigint;
    address: Slice;
}

export function storeVarAddress(src: VarAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 32);
        b_0.storeRef(src.address.asCell());
    };
}

export function loadVarAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(32);
    const _address = sc_0.loadRef().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleVarAddress(source: VarAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeSlice(source.address.asCell());
    return builder.build();
}

export function dictValueParserVarAddress(): DictionaryValue<VarAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeVarAddress(src)).endCell());
        },
        parse: (src) => {
            return loadVarAddress(src.loadRef().beginParse());
        }
    }
}

export type BasechainAddress = {
    $$type: 'BasechainAddress';
    hash: bigint | null;
}

export function storeBasechainAddress(src: BasechainAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        if (src.hash !== null && src.hash !== undefined) { b_0.storeBit(true).storeInt(src.hash, 257); } else { b_0.storeBit(false); }
    };
}

export function loadBasechainAddress(slice: Slice) {
    const sc_0 = slice;
    const _hash = sc_0.loadBit() ? sc_0.loadIntBig(257) : null;
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadGetterTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function storeTupleBasechainAddress(source: BasechainAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.hash);
    return builder.build();
}

export function dictValueParserBasechainAddress(): DictionaryValue<BasechainAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeBasechainAddress(src)).endCell());
        },
        parse: (src) => {
            return loadBasechainAddress(src.loadRef().beginParse());
        }
    }
}

export type Deploy = {
    $$type: 'Deploy';
    queryId: bigint;
}

export function storeDeploy(src: Deploy) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2490013878, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeploy(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2490013878) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadTupleDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadGetterTupleDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function storeTupleDeploy(source: Deploy) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDeploy(): DictionaryValue<Deploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadDeploy(src.loadRef().beginParse());
        }
    }
}

export type DeployOk = {
    $$type: 'DeployOk';
    queryId: bigint;
}

export function storeDeployOk(src: DeployOk) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2952335191, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeployOk(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2952335191) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadTupleDeployOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadGetterTupleDeployOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function storeTupleDeployOk(source: DeployOk) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDeployOk(): DictionaryValue<DeployOk> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployOk(src)).endCell());
        },
        parse: (src) => {
            return loadDeployOk(src.loadRef().beginParse());
        }
    }
}

export type FactoryDeploy = {
    $$type: 'FactoryDeploy';
    queryId: bigint;
    cashback: Address;
}

export function storeFactoryDeploy(src: FactoryDeploy) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1829761339, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.cashback);
    };
}

export function loadFactoryDeploy(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1829761339) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _cashback = sc_0.loadAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function loadTupleFactoryDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function loadGetterTupleFactoryDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function storeTupleFactoryDeploy(source: FactoryDeploy) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.cashback);
    return builder.build();
}

export function dictValueParserFactoryDeploy(): DictionaryValue<FactoryDeploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeFactoryDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadFactoryDeploy(src.loadRef().beginParse());
        }
    }
}

export type Register = {
    $$type: 'Register';
    name: string;
    capabilities: string;
    available: boolean;
}

export function storeRegister(src: Register) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(950051591, 32);
        b_0.storeStringRefTail(src.name);
        b_0.storeStringRefTail(src.capabilities);
        b_0.storeBit(src.available);
    };
}

export function loadRegister(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 950051591) { throw Error('Invalid prefix'); }
    const _name = sc_0.loadStringRefTail();
    const _capabilities = sc_0.loadStringRefTail();
    const _available = sc_0.loadBit();
    return { $$type: 'Register' as const, name: _name, capabilities: _capabilities, available: _available };
}

export function loadTupleRegister(source: TupleReader) {
    const _name = source.readString();
    const _capabilities = source.readString();
    const _available = source.readBoolean();
    return { $$type: 'Register' as const, name: _name, capabilities: _capabilities, available: _available };
}

export function loadGetterTupleRegister(source: TupleReader) {
    const _name = source.readString();
    const _capabilities = source.readString();
    const _available = source.readBoolean();
    return { $$type: 'Register' as const, name: _name, capabilities: _capabilities, available: _available };
}

export function storeTupleRegister(source: Register) {
    const builder = new TupleBuilder();
    builder.writeString(source.name);
    builder.writeString(source.capabilities);
    builder.writeBoolean(source.available);
    return builder.build();
}

export function dictValueParserRegister(): DictionaryValue<Register> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRegister(src)).endCell());
        },
        parse: (src) => {
            return loadRegister(src.loadRef().beginParse());
        }
    }
}

export type Rate = {
    $$type: 'Rate';
    agentName: string;
    success: boolean;
}

export function storeRate(src: Rate) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2804297358, 32);
        b_0.storeStringRefTail(src.agentName);
        b_0.storeBit(src.success);
    };
}

export function loadRate(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2804297358) { throw Error('Invalid prefix'); }
    const _agentName = sc_0.loadStringRefTail();
    const _success = sc_0.loadBit();
    return { $$type: 'Rate' as const, agentName: _agentName, success: _success };
}

export function loadTupleRate(source: TupleReader) {
    const _agentName = source.readString();
    const _success = source.readBoolean();
    return { $$type: 'Rate' as const, agentName: _agentName, success: _success };
}

export function loadGetterTupleRate(source: TupleReader) {
    const _agentName = source.readString();
    const _success = source.readBoolean();
    return { $$type: 'Rate' as const, agentName: _agentName, success: _success };
}

export function storeTupleRate(source: Rate) {
    const builder = new TupleBuilder();
    builder.writeString(source.agentName);
    builder.writeBoolean(source.success);
    return builder.build();
}

export function dictValueParserRate(): DictionaryValue<Rate> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRate(src)).endCell());
        },
        parse: (src) => {
            return loadRate(src.loadRef().beginParse());
        }
    }
}

export type UpdateAvailability = {
    $$type: 'UpdateAvailability';
    name: string;
    available: boolean;
}

export function storeUpdateAvailability(src: UpdateAvailability) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1424124491, 32);
        b_0.storeStringRefTail(src.name);
        b_0.storeBit(src.available);
    };
}

export function loadUpdateAvailability(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1424124491) { throw Error('Invalid prefix'); }
    const _name = sc_0.loadStringRefTail();
    const _available = sc_0.loadBit();
    return { $$type: 'UpdateAvailability' as const, name: _name, available: _available };
}

export function loadTupleUpdateAvailability(source: TupleReader) {
    const _name = source.readString();
    const _available = source.readBoolean();
    return { $$type: 'UpdateAvailability' as const, name: _name, available: _available };
}

export function loadGetterTupleUpdateAvailability(source: TupleReader) {
    const _name = source.readString();
    const _available = source.readBoolean();
    return { $$type: 'UpdateAvailability' as const, name: _name, available: _available };
}

export function storeTupleUpdateAvailability(source: UpdateAvailability) {
    const builder = new TupleBuilder();
    builder.writeString(source.name);
    builder.writeBoolean(source.available);
    return builder.build();
}

export function dictValueParserUpdateAvailability(): DictionaryValue<UpdateAvailability> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeUpdateAvailability(src)).endCell());
        },
        parse: (src) => {
            return loadUpdateAvailability(src.loadRef().beginParse());
        }
    }
}

export type Withdraw = {
    $$type: 'Withdraw';
}

export function storeWithdraw(src: Withdraw) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(593874976, 32);
    };
}

export function loadWithdraw(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 593874976) { throw Error('Invalid prefix'); }
    return { $$type: 'Withdraw' as const };
}

export function loadTupleWithdraw(source: TupleReader) {
    return { $$type: 'Withdraw' as const };
}

export function loadGetterTupleWithdraw(source: TupleReader) {
    return { $$type: 'Withdraw' as const };
}

export function storeTupleWithdraw(source: Withdraw) {
    const builder = new TupleBuilder();
    return builder.build();
}

export function dictValueParserWithdraw(): DictionaryValue<Withdraw> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeWithdraw(src)).endCell());
        },
        parse: (src) => {
            return loadWithdraw(src.loadRef().beginParse());
        }
    }
}

export type IndexCapability = {
    $$type: 'IndexCapability';
    agentIndex: bigint;
    capabilityHash: bigint;
}

export function storeIndexCapability(src: IndexCapability) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(344274104, 32);
        b_0.storeUint(src.agentIndex, 32);
        b_0.storeUint(src.capabilityHash, 256);
    };
}

export function loadIndexCapability(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 344274104) { throw Error('Invalid prefix'); }
    const _agentIndex = sc_0.loadUintBig(32);
    const _capabilityHash = sc_0.loadUintBig(256);
    return { $$type: 'IndexCapability' as const, agentIndex: _agentIndex, capabilityHash: _capabilityHash };
}

export function loadTupleIndexCapability(source: TupleReader) {
    const _agentIndex = source.readBigNumber();
    const _capabilityHash = source.readBigNumber();
    return { $$type: 'IndexCapability' as const, agentIndex: _agentIndex, capabilityHash: _capabilityHash };
}

export function loadGetterTupleIndexCapability(source: TupleReader) {
    const _agentIndex = source.readBigNumber();
    const _capabilityHash = source.readBigNumber();
    return { $$type: 'IndexCapability' as const, agentIndex: _agentIndex, capabilityHash: _capabilityHash };
}

export function storeTupleIndexCapability(source: IndexCapability) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.agentIndex);
    builder.writeNumber(source.capabilityHash);
    return builder.build();
}

export function dictValueParserIndexCapability(): DictionaryValue<IndexCapability> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeIndexCapability(src)).endCell());
        },
        parse: (src) => {
            return loadIndexCapability(src.loadRef().beginParse());
        }
    }
}

export type TriggerCleanup = {
    $$type: 'TriggerCleanup';
    maxClean: bigint;
}

export function storeTriggerCleanup(src: TriggerCleanup) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2266087279, 32);
        b_0.storeUint(src.maxClean, 8);
    };
}

export function loadTriggerCleanup(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2266087279) { throw Error('Invalid prefix'); }
    const _maxClean = sc_0.loadUintBig(8);
    return { $$type: 'TriggerCleanup' as const, maxClean: _maxClean };
}

export function loadTupleTriggerCleanup(source: TupleReader) {
    const _maxClean = source.readBigNumber();
    return { $$type: 'TriggerCleanup' as const, maxClean: _maxClean };
}

export function loadGetterTupleTriggerCleanup(source: TupleReader) {
    const _maxClean = source.readBigNumber();
    return { $$type: 'TriggerCleanup' as const, maxClean: _maxClean };
}

export function storeTupleTriggerCleanup(source: TriggerCleanup) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.maxClean);
    return builder.build();
}

export function dictValueParserTriggerCleanup(): DictionaryValue<TriggerCleanup> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeTriggerCleanup(src)).endCell());
        },
        parse: (src) => {
            return loadTriggerCleanup(src.loadRef().beginParse());
        }
    }
}

export type NotifyDisputeOpened = {
    $$type: 'NotifyDisputeOpened';
    escrowAddress: Address;
    depositor: Address;
    beneficiary: Address;
    amount: bigint;
    votingDeadline: bigint;
}

export function storeNotifyDisputeOpened(src: NotifyDisputeOpened) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(796807257, 32);
        b_0.storeAddress(src.escrowAddress);
        b_0.storeAddress(src.depositor);
        b_0.storeAddress(src.beneficiary);
        b_0.storeCoins(src.amount);
        b_0.storeUint(src.votingDeadline, 32);
    };
}

export function loadNotifyDisputeOpened(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 796807257) { throw Error('Invalid prefix'); }
    const _escrowAddress = sc_0.loadAddress();
    const _depositor = sc_0.loadAddress();
    const _beneficiary = sc_0.loadAddress();
    const _amount = sc_0.loadCoins();
    const _votingDeadline = sc_0.loadUintBig(32);
    return { $$type: 'NotifyDisputeOpened' as const, escrowAddress: _escrowAddress, depositor: _depositor, beneficiary: _beneficiary, amount: _amount, votingDeadline: _votingDeadline };
}

export function loadTupleNotifyDisputeOpened(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    const _depositor = source.readAddress();
    const _beneficiary = source.readAddress();
    const _amount = source.readBigNumber();
    const _votingDeadline = source.readBigNumber();
    return { $$type: 'NotifyDisputeOpened' as const, escrowAddress: _escrowAddress, depositor: _depositor, beneficiary: _beneficiary, amount: _amount, votingDeadline: _votingDeadline };
}

export function loadGetterTupleNotifyDisputeOpened(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    const _depositor = source.readAddress();
    const _beneficiary = source.readAddress();
    const _amount = source.readBigNumber();
    const _votingDeadline = source.readBigNumber();
    return { $$type: 'NotifyDisputeOpened' as const, escrowAddress: _escrowAddress, depositor: _depositor, beneficiary: _beneficiary, amount: _amount, votingDeadline: _votingDeadline };
}

export function storeTupleNotifyDisputeOpened(source: NotifyDisputeOpened) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.escrowAddress);
    builder.writeAddress(source.depositor);
    builder.writeAddress(source.beneficiary);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.votingDeadline);
    return builder.build();
}

export function dictValueParserNotifyDisputeOpened(): DictionaryValue<NotifyDisputeOpened> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeNotifyDisputeOpened(src)).endCell());
        },
        parse: (src) => {
            return loadNotifyDisputeOpened(src.loadRef().beginParse());
        }
    }
}

export type NotifyDisputeSettled = {
    $$type: 'NotifyDisputeSettled';
    escrowAddress: Address;
    released: boolean;
    refunded: boolean;
}

export function storeNotifyDisputeSettled(src: NotifyDisputeSettled) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3214956934, 32);
        b_0.storeAddress(src.escrowAddress);
        b_0.storeBit(src.released);
        b_0.storeBit(src.refunded);
    };
}

export function loadNotifyDisputeSettled(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3214956934) { throw Error('Invalid prefix'); }
    const _escrowAddress = sc_0.loadAddress();
    const _released = sc_0.loadBit();
    const _refunded = sc_0.loadBit();
    return { $$type: 'NotifyDisputeSettled' as const, escrowAddress: _escrowAddress, released: _released, refunded: _refunded };
}

export function loadTupleNotifyDisputeSettled(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    const _released = source.readBoolean();
    const _refunded = source.readBoolean();
    return { $$type: 'NotifyDisputeSettled' as const, escrowAddress: _escrowAddress, released: _released, refunded: _refunded };
}

export function loadGetterTupleNotifyDisputeSettled(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    const _released = source.readBoolean();
    const _refunded = source.readBoolean();
    return { $$type: 'NotifyDisputeSettled' as const, escrowAddress: _escrowAddress, released: _released, refunded: _refunded };
}

export function storeTupleNotifyDisputeSettled(source: NotifyDisputeSettled) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.escrowAddress);
    builder.writeBoolean(source.released);
    builder.writeBoolean(source.refunded);
    return builder.build();
}

export function dictValueParserNotifyDisputeSettled(): DictionaryValue<NotifyDisputeSettled> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeNotifyDisputeSettled(src)).endCell());
        },
        parse: (src) => {
            return loadNotifyDisputeSettled(src.loadRef().beginParse());
        }
    }
}

export type BroadcastIntent = {
    $$type: 'BroadcastIntent';
    serviceHash: bigint;
    budget: bigint;
    deadline: bigint;
}

export function storeBroadcastIntent(src: BroadcastIntent) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2523776749, 32);
        b_0.storeUint(src.serviceHash, 256);
        b_0.storeCoins(src.budget);
        b_0.storeUint(src.deadline, 32);
    };
}

export function loadBroadcastIntent(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2523776749) { throw Error('Invalid prefix'); }
    const _serviceHash = sc_0.loadUintBig(256);
    const _budget = sc_0.loadCoins();
    const _deadline = sc_0.loadUintBig(32);
    return { $$type: 'BroadcastIntent' as const, serviceHash: _serviceHash, budget: _budget, deadline: _deadline };
}

export function loadTupleBroadcastIntent(source: TupleReader) {
    const _serviceHash = source.readBigNumber();
    const _budget = source.readBigNumber();
    const _deadline = source.readBigNumber();
    return { $$type: 'BroadcastIntent' as const, serviceHash: _serviceHash, budget: _budget, deadline: _deadline };
}

export function loadGetterTupleBroadcastIntent(source: TupleReader) {
    const _serviceHash = source.readBigNumber();
    const _budget = source.readBigNumber();
    const _deadline = source.readBigNumber();
    return { $$type: 'BroadcastIntent' as const, serviceHash: _serviceHash, budget: _budget, deadline: _deadline };
}

export function storeTupleBroadcastIntent(source: BroadcastIntent) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.serviceHash);
    builder.writeNumber(source.budget);
    builder.writeNumber(source.deadline);
    return builder.build();
}

export function dictValueParserBroadcastIntent(): DictionaryValue<BroadcastIntent> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeBroadcastIntent(src)).endCell());
        },
        parse: (src) => {
            return loadBroadcastIntent(src.loadRef().beginParse());
        }
    }
}

export type SendOffer = {
    $$type: 'SendOffer';
    intentIndex: bigint;
    price: bigint;
    deliveryTime: bigint;
}

export function storeSendOffer(src: SendOffer) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1834677927, 32);
        b_0.storeUint(src.intentIndex, 32);
        b_0.storeCoins(src.price);
        b_0.storeUint(src.deliveryTime, 32);
    };
}

export function loadSendOffer(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1834677927) { throw Error('Invalid prefix'); }
    const _intentIndex = sc_0.loadUintBig(32);
    const _price = sc_0.loadCoins();
    const _deliveryTime = sc_0.loadUintBig(32);
    return { $$type: 'SendOffer' as const, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime };
}

export function loadTupleSendOffer(source: TupleReader) {
    const _intentIndex = source.readBigNumber();
    const _price = source.readBigNumber();
    const _deliveryTime = source.readBigNumber();
    return { $$type: 'SendOffer' as const, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime };
}

export function loadGetterTupleSendOffer(source: TupleReader) {
    const _intentIndex = source.readBigNumber();
    const _price = source.readBigNumber();
    const _deliveryTime = source.readBigNumber();
    return { $$type: 'SendOffer' as const, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime };
}

export function storeTupleSendOffer(source: SendOffer) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.intentIndex);
    builder.writeNumber(source.price);
    builder.writeNumber(source.deliveryTime);
    return builder.build();
}

export function dictValueParserSendOffer(): DictionaryValue<SendOffer> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSendOffer(src)).endCell());
        },
        parse: (src) => {
            return loadSendOffer(src.loadRef().beginParse());
        }
    }
}

export type AcceptOffer = {
    $$type: 'AcceptOffer';
    offerIndex: bigint;
}

export function storeAcceptOffer(src: AcceptOffer) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(931468685, 32);
        b_0.storeUint(src.offerIndex, 32);
    };
}

export function loadAcceptOffer(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 931468685) { throw Error('Invalid prefix'); }
    const _offerIndex = sc_0.loadUintBig(32);
    return { $$type: 'AcceptOffer' as const, offerIndex: _offerIndex };
}

export function loadTupleAcceptOffer(source: TupleReader) {
    const _offerIndex = source.readBigNumber();
    return { $$type: 'AcceptOffer' as const, offerIndex: _offerIndex };
}

export function loadGetterTupleAcceptOffer(source: TupleReader) {
    const _offerIndex = source.readBigNumber();
    return { $$type: 'AcceptOffer' as const, offerIndex: _offerIndex };
}

export function storeTupleAcceptOffer(source: AcceptOffer) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.offerIndex);
    return builder.build();
}

export function dictValueParserAcceptOffer(): DictionaryValue<AcceptOffer> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAcceptOffer(src)).endCell());
        },
        parse: (src) => {
            return loadAcceptOffer(src.loadRef().beginParse());
        }
    }
}

export type CancelIntent = {
    $$type: 'CancelIntent';
    intentIndex: bigint;
}

export function storeCancelIntent(src: CancelIntent) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1000023198, 32);
        b_0.storeUint(src.intentIndex, 32);
    };
}

export function loadCancelIntent(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1000023198) { throw Error('Invalid prefix'); }
    const _intentIndex = sc_0.loadUintBig(32);
    return { $$type: 'CancelIntent' as const, intentIndex: _intentIndex };
}

export function loadTupleCancelIntent(source: TupleReader) {
    const _intentIndex = source.readBigNumber();
    return { $$type: 'CancelIntent' as const, intentIndex: _intentIndex };
}

export function loadGetterTupleCancelIntent(source: TupleReader) {
    const _intentIndex = source.readBigNumber();
    return { $$type: 'CancelIntent' as const, intentIndex: _intentIndex };
}

export function storeTupleCancelIntent(source: CancelIntent) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.intentIndex);
    return builder.build();
}

export function dictValueParserCancelIntent(): DictionaryValue<CancelIntent> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeCancelIntent(src)).endCell());
        },
        parse: (src) => {
            return loadCancelIntent(src.loadRef().beginParse());
        }
    }
}

export type SettleDeal = {
    $$type: 'SettleDeal';
    intentIndex: bigint;
    rating: bigint;
}

export function storeSettleDeal(src: SettleDeal) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(484654478, 32);
        b_0.storeUint(src.intentIndex, 32);
        b_0.storeUint(src.rating, 8);
    };
}

export function loadSettleDeal(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 484654478) { throw Error('Invalid prefix'); }
    const _intentIndex = sc_0.loadUintBig(32);
    const _rating = sc_0.loadUintBig(8);
    return { $$type: 'SettleDeal' as const, intentIndex: _intentIndex, rating: _rating };
}

export function loadTupleSettleDeal(source: TupleReader) {
    const _intentIndex = source.readBigNumber();
    const _rating = source.readBigNumber();
    return { $$type: 'SettleDeal' as const, intentIndex: _intentIndex, rating: _rating };
}

export function loadGetterTupleSettleDeal(source: TupleReader) {
    const _intentIndex = source.readBigNumber();
    const _rating = source.readBigNumber();
    return { $$type: 'SettleDeal' as const, intentIndex: _intentIndex, rating: _rating };
}

export function storeTupleSettleDeal(source: SettleDeal) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.intentIndex);
    builder.writeNumber(source.rating);
    return builder.build();
}

export function dictValueParserSettleDeal(): DictionaryValue<SettleDeal> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSettleDeal(src)).endCell());
        },
        parse: (src) => {
            return loadSettleDeal(src.loadRef().beginParse());
        }
    }
}

export type AgentData = {
    $$type: 'AgentData';
    owner: Address;
    available: boolean;
    totalTasks: bigint;
    successes: bigint;
    registeredAt: bigint;
}

export function storeAgentData(src: AgentData) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeBit(src.available);
        b_0.storeUint(src.totalTasks, 32);
        b_0.storeUint(src.successes, 32);
        b_0.storeUint(src.registeredAt, 32);
    };
}

export function loadAgentData(slice: Slice) {
    const sc_0 = slice;
    const _owner = sc_0.loadAddress();
    const _available = sc_0.loadBit();
    const _totalTasks = sc_0.loadUintBig(32);
    const _successes = sc_0.loadUintBig(32);
    const _registeredAt = sc_0.loadUintBig(32);
    return { $$type: 'AgentData' as const, owner: _owner, available: _available, totalTasks: _totalTasks, successes: _successes, registeredAt: _registeredAt };
}

export function loadTupleAgentData(source: TupleReader) {
    const _owner = source.readAddress();
    const _available = source.readBoolean();
    const _totalTasks = source.readBigNumber();
    const _successes = source.readBigNumber();
    const _registeredAt = source.readBigNumber();
    return { $$type: 'AgentData' as const, owner: _owner, available: _available, totalTasks: _totalTasks, successes: _successes, registeredAt: _registeredAt };
}

export function loadGetterTupleAgentData(source: TupleReader) {
    const _owner = source.readAddress();
    const _available = source.readBoolean();
    const _totalTasks = source.readBigNumber();
    const _successes = source.readBigNumber();
    const _registeredAt = source.readBigNumber();
    return { $$type: 'AgentData' as const, owner: _owner, available: _available, totalTasks: _totalTasks, successes: _successes, registeredAt: _registeredAt };
}

export function storeTupleAgentData(source: AgentData) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.owner);
    builder.writeBoolean(source.available);
    builder.writeNumber(source.totalTasks);
    builder.writeNumber(source.successes);
    builder.writeNumber(source.registeredAt);
    return builder.build();
}

export function dictValueParserAgentData(): DictionaryValue<AgentData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAgentData(src)).endCell());
        },
        parse: (src) => {
            return loadAgentData(src.loadRef().beginParse());
        }
    }
}

export type DisputeInfo = {
    $$type: 'DisputeInfo';
    escrowAddress: Address;
    depositor: Address;
    beneficiary: Address;
    amount: bigint;
    votingDeadline: bigint;
    settled: boolean;
}

export function storeDisputeInfo(src: DisputeInfo) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.escrowAddress);
        b_0.storeAddress(src.depositor);
        b_0.storeAddress(src.beneficiary);
        b_0.storeCoins(src.amount);
        b_0.storeUint(src.votingDeadline, 32);
        b_0.storeBit(src.settled);
    };
}

export function loadDisputeInfo(slice: Slice) {
    const sc_0 = slice;
    const _escrowAddress = sc_0.loadAddress();
    const _depositor = sc_0.loadAddress();
    const _beneficiary = sc_0.loadAddress();
    const _amount = sc_0.loadCoins();
    const _votingDeadline = sc_0.loadUintBig(32);
    const _settled = sc_0.loadBit();
    return { $$type: 'DisputeInfo' as const, escrowAddress: _escrowAddress, depositor: _depositor, beneficiary: _beneficiary, amount: _amount, votingDeadline: _votingDeadline, settled: _settled };
}

export function loadTupleDisputeInfo(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    const _depositor = source.readAddress();
    const _beneficiary = source.readAddress();
    const _amount = source.readBigNumber();
    const _votingDeadline = source.readBigNumber();
    const _settled = source.readBoolean();
    return { $$type: 'DisputeInfo' as const, escrowAddress: _escrowAddress, depositor: _depositor, beneficiary: _beneficiary, amount: _amount, votingDeadline: _votingDeadline, settled: _settled };
}

export function loadGetterTupleDisputeInfo(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    const _depositor = source.readAddress();
    const _beneficiary = source.readAddress();
    const _amount = source.readBigNumber();
    const _votingDeadline = source.readBigNumber();
    const _settled = source.readBoolean();
    return { $$type: 'DisputeInfo' as const, escrowAddress: _escrowAddress, depositor: _depositor, beneficiary: _beneficiary, amount: _amount, votingDeadline: _votingDeadline, settled: _settled };
}

export function storeTupleDisputeInfo(source: DisputeInfo) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.escrowAddress);
    builder.writeAddress(source.depositor);
    builder.writeAddress(source.beneficiary);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.votingDeadline);
    builder.writeBoolean(source.settled);
    return builder.build();
}

export function dictValueParserDisputeInfo(): DictionaryValue<DisputeInfo> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDisputeInfo(src)).endCell());
        },
        parse: (src) => {
            return loadDisputeInfo(src.loadRef().beginParse());
        }
    }
}

export type AgentCleanupInfo = {
    $$type: 'AgentCleanupInfo';
    index: bigint;
    exists: boolean;
    score: bigint;
    totalRatings: bigint;
    registeredAt: bigint;
    lastActive: bigint;
    daysSinceActive: bigint;
    daysSinceRegistered: bigint;
    eligibleForCleanup: boolean;
    cleanupReason: bigint;
}

export function storeAgentCleanupInfo(src: AgentCleanupInfo) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(src.index, 32);
        b_0.storeBit(src.exists);
        b_0.storeUint(src.score, 16);
        b_0.storeUint(src.totalRatings, 32);
        b_0.storeUint(src.registeredAt, 32);
        b_0.storeUint(src.lastActive, 32);
        b_0.storeUint(src.daysSinceActive, 32);
        b_0.storeUint(src.daysSinceRegistered, 32);
        b_0.storeBit(src.eligibleForCleanup);
        b_0.storeUint(src.cleanupReason, 8);
    };
}

export function loadAgentCleanupInfo(slice: Slice) {
    const sc_0 = slice;
    const _index = sc_0.loadUintBig(32);
    const _exists = sc_0.loadBit();
    const _score = sc_0.loadUintBig(16);
    const _totalRatings = sc_0.loadUintBig(32);
    const _registeredAt = sc_0.loadUintBig(32);
    const _lastActive = sc_0.loadUintBig(32);
    const _daysSinceActive = sc_0.loadUintBig(32);
    const _daysSinceRegistered = sc_0.loadUintBig(32);
    const _eligibleForCleanup = sc_0.loadBit();
    const _cleanupReason = sc_0.loadUintBig(8);
    return { $$type: 'AgentCleanupInfo' as const, index: _index, exists: _exists, score: _score, totalRatings: _totalRatings, registeredAt: _registeredAt, lastActive: _lastActive, daysSinceActive: _daysSinceActive, daysSinceRegistered: _daysSinceRegistered, eligibleForCleanup: _eligibleForCleanup, cleanupReason: _cleanupReason };
}

export function loadTupleAgentCleanupInfo(source: TupleReader) {
    const _index = source.readBigNumber();
    const _exists = source.readBoolean();
    const _score = source.readBigNumber();
    const _totalRatings = source.readBigNumber();
    const _registeredAt = source.readBigNumber();
    const _lastActive = source.readBigNumber();
    const _daysSinceActive = source.readBigNumber();
    const _daysSinceRegistered = source.readBigNumber();
    const _eligibleForCleanup = source.readBoolean();
    const _cleanupReason = source.readBigNumber();
    return { $$type: 'AgentCleanupInfo' as const, index: _index, exists: _exists, score: _score, totalRatings: _totalRatings, registeredAt: _registeredAt, lastActive: _lastActive, daysSinceActive: _daysSinceActive, daysSinceRegistered: _daysSinceRegistered, eligibleForCleanup: _eligibleForCleanup, cleanupReason: _cleanupReason };
}

export function loadGetterTupleAgentCleanupInfo(source: TupleReader) {
    const _index = source.readBigNumber();
    const _exists = source.readBoolean();
    const _score = source.readBigNumber();
    const _totalRatings = source.readBigNumber();
    const _registeredAt = source.readBigNumber();
    const _lastActive = source.readBigNumber();
    const _daysSinceActive = source.readBigNumber();
    const _daysSinceRegistered = source.readBigNumber();
    const _eligibleForCleanup = source.readBoolean();
    const _cleanupReason = source.readBigNumber();
    return { $$type: 'AgentCleanupInfo' as const, index: _index, exists: _exists, score: _score, totalRatings: _totalRatings, registeredAt: _registeredAt, lastActive: _lastActive, daysSinceActive: _daysSinceActive, daysSinceRegistered: _daysSinceRegistered, eligibleForCleanup: _eligibleForCleanup, cleanupReason: _cleanupReason };
}

export function storeTupleAgentCleanupInfo(source: AgentCleanupInfo) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.index);
    builder.writeBoolean(source.exists);
    builder.writeNumber(source.score);
    builder.writeNumber(source.totalRatings);
    builder.writeNumber(source.registeredAt);
    builder.writeNumber(source.lastActive);
    builder.writeNumber(source.daysSinceActive);
    builder.writeNumber(source.daysSinceRegistered);
    builder.writeBoolean(source.eligibleForCleanup);
    builder.writeNumber(source.cleanupReason);
    return builder.build();
}

export function dictValueParserAgentCleanupInfo(): DictionaryValue<AgentCleanupInfo> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAgentCleanupInfo(src)).endCell());
        },
        parse: (src) => {
            return loadAgentCleanupInfo(src.loadRef().beginParse());
        }
    }
}

export type IntentData = {
    $$type: 'IntentData';
    buyer: Address;
    serviceHash: bigint;
    budget: bigint;
    deadline: bigint;
    status: bigint;
    acceptedOffer: bigint;
    isExpired: boolean;
}

export function storeIntentData(src: IntentData) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.buyer);
        b_0.storeUint(src.serviceHash, 256);
        b_0.storeCoins(src.budget);
        b_0.storeUint(src.deadline, 32);
        b_0.storeUint(src.status, 8);
        b_0.storeUint(src.acceptedOffer, 32);
        b_0.storeBit(src.isExpired);
    };
}

export function loadIntentData(slice: Slice) {
    const sc_0 = slice;
    const _buyer = sc_0.loadAddress();
    const _serviceHash = sc_0.loadUintBig(256);
    const _budget = sc_0.loadCoins();
    const _deadline = sc_0.loadUintBig(32);
    const _status = sc_0.loadUintBig(8);
    const _acceptedOffer = sc_0.loadUintBig(32);
    const _isExpired = sc_0.loadBit();
    return { $$type: 'IntentData' as const, buyer: _buyer, serviceHash: _serviceHash, budget: _budget, deadline: _deadline, status: _status, acceptedOffer: _acceptedOffer, isExpired: _isExpired };
}

export function loadTupleIntentData(source: TupleReader) {
    const _buyer = source.readAddress();
    const _serviceHash = source.readBigNumber();
    const _budget = source.readBigNumber();
    const _deadline = source.readBigNumber();
    const _status = source.readBigNumber();
    const _acceptedOffer = source.readBigNumber();
    const _isExpired = source.readBoolean();
    return { $$type: 'IntentData' as const, buyer: _buyer, serviceHash: _serviceHash, budget: _budget, deadline: _deadline, status: _status, acceptedOffer: _acceptedOffer, isExpired: _isExpired };
}

export function loadGetterTupleIntentData(source: TupleReader) {
    const _buyer = source.readAddress();
    const _serviceHash = source.readBigNumber();
    const _budget = source.readBigNumber();
    const _deadline = source.readBigNumber();
    const _status = source.readBigNumber();
    const _acceptedOffer = source.readBigNumber();
    const _isExpired = source.readBoolean();
    return { $$type: 'IntentData' as const, buyer: _buyer, serviceHash: _serviceHash, budget: _budget, deadline: _deadline, status: _status, acceptedOffer: _acceptedOffer, isExpired: _isExpired };
}

export function storeTupleIntentData(source: IntentData) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.buyer);
    builder.writeNumber(source.serviceHash);
    builder.writeNumber(source.budget);
    builder.writeNumber(source.deadline);
    builder.writeNumber(source.status);
    builder.writeNumber(source.acceptedOffer);
    builder.writeBoolean(source.isExpired);
    return builder.build();
}

export function dictValueParserIntentData(): DictionaryValue<IntentData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeIntentData(src)).endCell());
        },
        parse: (src) => {
            return loadIntentData(src.loadRef().beginParse());
        }
    }
}

export type OfferData = {
    $$type: 'OfferData';
    seller: Address;
    intentIndex: bigint;
    price: bigint;
    deliveryTime: bigint;
    status: bigint;
}

export function storeOfferData(src: OfferData) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.seller);
        b_0.storeUint(src.intentIndex, 32);
        b_0.storeCoins(src.price);
        b_0.storeUint(src.deliveryTime, 32);
        b_0.storeUint(src.status, 8);
    };
}

export function loadOfferData(slice: Slice) {
    const sc_0 = slice;
    const _seller = sc_0.loadAddress();
    const _intentIndex = sc_0.loadUintBig(32);
    const _price = sc_0.loadCoins();
    const _deliveryTime = sc_0.loadUintBig(32);
    const _status = sc_0.loadUintBig(8);
    return { $$type: 'OfferData' as const, seller: _seller, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime, status: _status };
}

export function loadTupleOfferData(source: TupleReader) {
    const _seller = source.readAddress();
    const _intentIndex = source.readBigNumber();
    const _price = source.readBigNumber();
    const _deliveryTime = source.readBigNumber();
    const _status = source.readBigNumber();
    return { $$type: 'OfferData' as const, seller: _seller, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime, status: _status };
}

export function loadGetterTupleOfferData(source: TupleReader) {
    const _seller = source.readAddress();
    const _intentIndex = source.readBigNumber();
    const _price = source.readBigNumber();
    const _deliveryTime = source.readBigNumber();
    const _status = source.readBigNumber();
    return { $$type: 'OfferData' as const, seller: _seller, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime, status: _status };
}

export function storeTupleOfferData(source: OfferData) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.seller);
    builder.writeNumber(source.intentIndex);
    builder.writeNumber(source.price);
    builder.writeNumber(source.deliveryTime);
    builder.writeNumber(source.status);
    return builder.build();
}

export function dictValueParserOfferData(): DictionaryValue<OfferData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeOfferData(src)).endCell());
        },
        parse: (src) => {
            return loadOfferData(src.loadRef().beginParse());
        }
    }
}

export type Reputation$Data = {
    $$type: 'Reputation$Data';
    owner: Address;
    fee: bigint;
    agentCount: bigint;
    agentOwners: Dictionary<number, Address>;
    agentAvailable: Dictionary<number, boolean>;
    agentTotalTasks: Dictionary<number, number>;
    agentSuccesses: Dictionary<number, number>;
    agentRegisteredAt: Dictionary<number, number>;
    agentLastActive: Dictionary<number, number>;
    nameToIndex: Dictionary<bigint, number>;
    capabilityIndex: Dictionary<bigint, Cell>;
    openDisputes: Dictionary<number, Address>;
    disputeDepositors: Dictionary<number, Address>;
    disputeBeneficiaries: Dictionary<number, Address>;
    disputeAmounts: Dictionary<number, bigint>;
    disputeDeadlines: Dictionary<number, number>;
    disputeSettled: Dictionary<number, boolean>;
    disputeCount: bigint;
    cleanupCursor: bigint;
    intents: Dictionary<number, Address>;
    intentServiceHashes: Dictionary<number, bigint>;
    intentBudgets: Dictionary<number, bigint>;
    intentDeadlines: Dictionary<number, number>;
    intentStatuses: Dictionary<number, number>;
    intentAcceptedOffer: Dictionary<number, number>;
    intentCount: bigint;
    intentsByService: Dictionary<bigint, Cell>;
    offers: Dictionary<number, Address>;
    offerIntents: Dictionary<number, number>;
    offerPrices: Dictionary<number, bigint>;
    offerDeliveryTimes: Dictionary<number, number>;
    offerStatuses: Dictionary<number, number>;
    offerCount: bigint;
    intentCleanupCursor: bigint;
    agentActiveIntents: Dictionary<Address, bigint>;
    maxIntentsPerAgent: bigint;
}

export function storeReputation$Data(src: Reputation$Data) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeCoins(src.fee);
        b_0.storeUint(src.agentCount, 32);
        b_0.storeDict(src.agentOwners, Dictionary.Keys.Uint(32), Dictionary.Values.Address());
        b_0.storeDict(src.agentAvailable, Dictionary.Keys.Uint(32), Dictionary.Values.Bool());
        const b_1 = new Builder();
        b_1.storeDict(src.agentTotalTasks, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_1.storeDict(src.agentSuccesses, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_1.storeDict(src.agentRegisteredAt, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        const b_2 = new Builder();
        b_2.storeDict(src.agentLastActive, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_2.storeDict(src.nameToIndex, Dictionary.Keys.BigUint(256), Dictionary.Values.Uint(32));
        b_2.storeDict(src.capabilityIndex, Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
        const b_3 = new Builder();
        b_3.storeDict(src.openDisputes, Dictionary.Keys.Uint(32), Dictionary.Values.Address());
        b_3.storeDict(src.disputeDepositors, Dictionary.Keys.Uint(32), Dictionary.Values.Address());
        b_3.storeDict(src.disputeBeneficiaries, Dictionary.Keys.Uint(32), Dictionary.Values.Address());
        const b_4 = new Builder();
        b_4.storeDict(src.disputeAmounts, Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257));
        b_4.storeDict(src.disputeDeadlines, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_4.storeDict(src.disputeSettled, Dictionary.Keys.Uint(32), Dictionary.Values.Bool());
        b_4.storeUint(src.disputeCount, 32);
        b_4.storeUint(src.cleanupCursor, 32);
        const b_5 = new Builder();
        b_5.storeDict(src.intents, Dictionary.Keys.Uint(32), Dictionary.Values.Address());
        b_5.storeDict(src.intentServiceHashes, Dictionary.Keys.Uint(32), Dictionary.Values.BigUint(256));
        b_5.storeDict(src.intentBudgets, Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257));
        const b_6 = new Builder();
        b_6.storeDict(src.intentDeadlines, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_6.storeDict(src.intentStatuses, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8));
        b_6.storeDict(src.intentAcceptedOffer, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_6.storeUint(src.intentCount, 32);
        const b_7 = new Builder();
        b_7.storeDict(src.intentsByService, Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
        b_7.storeDict(src.offers, Dictionary.Keys.Uint(32), Dictionary.Values.Address());
        b_7.storeDict(src.offerIntents, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        const b_8 = new Builder();
        b_8.storeDict(src.offerPrices, Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257));
        b_8.storeDict(src.offerDeliveryTimes, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_8.storeDict(src.offerStatuses, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8));
        b_8.storeUint(src.offerCount, 32);
        b_8.storeUint(src.intentCleanupCursor, 32);
        b_8.storeDict(src.agentActiveIntents, Dictionary.Keys.Address(), Dictionary.Values.BigInt(257));
        b_8.storeUint(src.maxIntentsPerAgent, 8);
        b_7.storeRef(b_8.endCell());
        b_6.storeRef(b_7.endCell());
        b_5.storeRef(b_6.endCell());
        b_4.storeRef(b_5.endCell());
        b_3.storeRef(b_4.endCell());
        b_2.storeRef(b_3.endCell());
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadReputation$Data(slice: Slice) {
    const sc_0 = slice;
    const _owner = sc_0.loadAddress();
    const _fee = sc_0.loadCoins();
    const _agentCount = sc_0.loadUintBig(32);
    const _agentOwners = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), sc_0);
    const _agentAvailable = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), sc_0);
    const sc_1 = sc_0.loadRef().beginParse();
    const _agentTotalTasks = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_1);
    const _agentSuccesses = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_1);
    const _agentRegisteredAt = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_1);
    const sc_2 = sc_1.loadRef().beginParse();
    const _agentLastActive = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_2);
    const _nameToIndex = Dictionary.load(Dictionary.Keys.BigUint(256), Dictionary.Values.Uint(32), sc_2);
    const _capabilityIndex = Dictionary.load(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell(), sc_2);
    const sc_3 = sc_2.loadRef().beginParse();
    const _openDisputes = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), sc_3);
    const _disputeDepositors = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), sc_3);
    const _disputeBeneficiaries = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), sc_3);
    const sc_4 = sc_3.loadRef().beginParse();
    const _disputeAmounts = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), sc_4);
    const _disputeDeadlines = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_4);
    const _disputeSettled = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), sc_4);
    const _disputeCount = sc_4.loadUintBig(32);
    const _cleanupCursor = sc_4.loadUintBig(32);
    const sc_5 = sc_4.loadRef().beginParse();
    const _intents = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), sc_5);
    const _intentServiceHashes = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.BigUint(256), sc_5);
    const _intentBudgets = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), sc_5);
    const sc_6 = sc_5.loadRef().beginParse();
    const _intentDeadlines = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_6);
    const _intentStatuses = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), sc_6);
    const _intentAcceptedOffer = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_6);
    const _intentCount = sc_6.loadUintBig(32);
    const sc_7 = sc_6.loadRef().beginParse();
    const _intentsByService = Dictionary.load(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell(), sc_7);
    const _offers = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), sc_7);
    const _offerIntents = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_7);
    const sc_8 = sc_7.loadRef().beginParse();
    const _offerPrices = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), sc_8);
    const _offerDeliveryTimes = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_8);
    const _offerStatuses = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), sc_8);
    const _offerCount = sc_8.loadUintBig(32);
    const _intentCleanupCursor = sc_8.loadUintBig(32);
    const _agentActiveIntents = Dictionary.load(Dictionary.Keys.Address(), Dictionary.Values.BigInt(257), sc_8);
    const _maxIntentsPerAgent = sc_8.loadUintBig(8);
    return { $$type: 'Reputation$Data' as const, owner: _owner, fee: _fee, agentCount: _agentCount, agentOwners: _agentOwners, agentAvailable: _agentAvailable, agentTotalTasks: _agentTotalTasks, agentSuccesses: _agentSuccesses, agentRegisteredAt: _agentRegisteredAt, agentLastActive: _agentLastActive, nameToIndex: _nameToIndex, capabilityIndex: _capabilityIndex, openDisputes: _openDisputes, disputeDepositors: _disputeDepositors, disputeBeneficiaries: _disputeBeneficiaries, disputeAmounts: _disputeAmounts, disputeDeadlines: _disputeDeadlines, disputeSettled: _disputeSettled, disputeCount: _disputeCount, cleanupCursor: _cleanupCursor, intents: _intents, intentServiceHashes: _intentServiceHashes, intentBudgets: _intentBudgets, intentDeadlines: _intentDeadlines, intentStatuses: _intentStatuses, intentAcceptedOffer: _intentAcceptedOffer, intentCount: _intentCount, intentsByService: _intentsByService, offers: _offers, offerIntents: _offerIntents, offerPrices: _offerPrices, offerDeliveryTimes: _offerDeliveryTimes, offerStatuses: _offerStatuses, offerCount: _offerCount, intentCleanupCursor: _intentCleanupCursor, agentActiveIntents: _agentActiveIntents, maxIntentsPerAgent: _maxIntentsPerAgent };
}

export function loadTupleReputation$Data(source: TupleReader) {
    const _owner = source.readAddress();
    const _fee = source.readBigNumber();
    const _agentCount = source.readBigNumber();
    const _agentOwners = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _agentAvailable = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), source.readCellOpt());
    const _agentTotalTasks = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _agentSuccesses = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _agentRegisteredAt = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _agentLastActive = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _nameToIndex = Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Uint(32), source.readCellOpt());
    const _capabilityIndex = Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell(), source.readCellOpt());
    const _openDisputes = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _disputeDepositors = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _disputeBeneficiaries = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    source = source.readTuple();
    const _disputeAmounts = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _disputeDeadlines = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _disputeSettled = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), source.readCellOpt());
    const _disputeCount = source.readBigNumber();
    const _cleanupCursor = source.readBigNumber();
    const _intents = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _intentServiceHashes = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigUint(256), source.readCellOpt());
    const _intentBudgets = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _intentDeadlines = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _intentStatuses = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), source.readCellOpt());
    const _intentAcceptedOffer = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _intentCount = source.readBigNumber();
    const _intentsByService = Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell(), source.readCellOpt());
    const _offers = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    source = source.readTuple();
    const _offerIntents = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _offerPrices = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _offerDeliveryTimes = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _offerStatuses = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), source.readCellOpt());
    const _offerCount = source.readBigNumber();
    const _intentCleanupCursor = source.readBigNumber();
    const _agentActiveIntents = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _maxIntentsPerAgent = source.readBigNumber();
    return { $$type: 'Reputation$Data' as const, owner: _owner, fee: _fee, agentCount: _agentCount, agentOwners: _agentOwners, agentAvailable: _agentAvailable, agentTotalTasks: _agentTotalTasks, agentSuccesses: _agentSuccesses, agentRegisteredAt: _agentRegisteredAt, agentLastActive: _agentLastActive, nameToIndex: _nameToIndex, capabilityIndex: _capabilityIndex, openDisputes: _openDisputes, disputeDepositors: _disputeDepositors, disputeBeneficiaries: _disputeBeneficiaries, disputeAmounts: _disputeAmounts, disputeDeadlines: _disputeDeadlines, disputeSettled: _disputeSettled, disputeCount: _disputeCount, cleanupCursor: _cleanupCursor, intents: _intents, intentServiceHashes: _intentServiceHashes, intentBudgets: _intentBudgets, intentDeadlines: _intentDeadlines, intentStatuses: _intentStatuses, intentAcceptedOffer: _intentAcceptedOffer, intentCount: _intentCount, intentsByService: _intentsByService, offers: _offers, offerIntents: _offerIntents, offerPrices: _offerPrices, offerDeliveryTimes: _offerDeliveryTimes, offerStatuses: _offerStatuses, offerCount: _offerCount, intentCleanupCursor: _intentCleanupCursor, agentActiveIntents: _agentActiveIntents, maxIntentsPerAgent: _maxIntentsPerAgent };
}

export function loadGetterTupleReputation$Data(source: TupleReader) {
    const _owner = source.readAddress();
    const _fee = source.readBigNumber();
    const _agentCount = source.readBigNumber();
    const _agentOwners = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _agentAvailable = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), source.readCellOpt());
    const _agentTotalTasks = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _agentSuccesses = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _agentRegisteredAt = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _agentLastActive = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _nameToIndex = Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Uint(32), source.readCellOpt());
    const _capabilityIndex = Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell(), source.readCellOpt());
    const _openDisputes = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _disputeDepositors = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _disputeBeneficiaries = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _disputeAmounts = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _disputeDeadlines = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _disputeSettled = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), source.readCellOpt());
    const _disputeCount = source.readBigNumber();
    const _cleanupCursor = source.readBigNumber();
    const _intents = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _intentServiceHashes = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigUint(256), source.readCellOpt());
    const _intentBudgets = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _intentDeadlines = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _intentStatuses = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), source.readCellOpt());
    const _intentAcceptedOffer = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _intentCount = source.readBigNumber();
    const _intentsByService = Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell(), source.readCellOpt());
    const _offers = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _offerIntents = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _offerPrices = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _offerDeliveryTimes = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _offerStatuses = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), source.readCellOpt());
    const _offerCount = source.readBigNumber();
    const _intentCleanupCursor = source.readBigNumber();
    const _agentActiveIntents = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _maxIntentsPerAgent = source.readBigNumber();
    return { $$type: 'Reputation$Data' as const, owner: _owner, fee: _fee, agentCount: _agentCount, agentOwners: _agentOwners, agentAvailable: _agentAvailable, agentTotalTasks: _agentTotalTasks, agentSuccesses: _agentSuccesses, agentRegisteredAt: _agentRegisteredAt, agentLastActive: _agentLastActive, nameToIndex: _nameToIndex, capabilityIndex: _capabilityIndex, openDisputes: _openDisputes, disputeDepositors: _disputeDepositors, disputeBeneficiaries: _disputeBeneficiaries, disputeAmounts: _disputeAmounts, disputeDeadlines: _disputeDeadlines, disputeSettled: _disputeSettled, disputeCount: _disputeCount, cleanupCursor: _cleanupCursor, intents: _intents, intentServiceHashes: _intentServiceHashes, intentBudgets: _intentBudgets, intentDeadlines: _intentDeadlines, intentStatuses: _intentStatuses, intentAcceptedOffer: _intentAcceptedOffer, intentCount: _intentCount, intentsByService: _intentsByService, offers: _offers, offerIntents: _offerIntents, offerPrices: _offerPrices, offerDeliveryTimes: _offerDeliveryTimes, offerStatuses: _offerStatuses, offerCount: _offerCount, intentCleanupCursor: _intentCleanupCursor, agentActiveIntents: _agentActiveIntents, maxIntentsPerAgent: _maxIntentsPerAgent };
}

export function storeTupleReputation$Data(source: Reputation$Data) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.owner);
    builder.writeNumber(source.fee);
    builder.writeNumber(source.agentCount);
    builder.writeCell(source.agentOwners.size > 0 ? beginCell().storeDictDirect(source.agentOwners, Dictionary.Keys.Uint(32), Dictionary.Values.Address()).endCell() : null);
    builder.writeCell(source.agentAvailable.size > 0 ? beginCell().storeDictDirect(source.agentAvailable, Dictionary.Keys.Uint(32), Dictionary.Values.Bool()).endCell() : null);
    builder.writeCell(source.agentTotalTasks.size > 0 ? beginCell().storeDictDirect(source.agentTotalTasks, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.agentSuccesses.size > 0 ? beginCell().storeDictDirect(source.agentSuccesses, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.agentRegisteredAt.size > 0 ? beginCell().storeDictDirect(source.agentRegisteredAt, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.agentLastActive.size > 0 ? beginCell().storeDictDirect(source.agentLastActive, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.nameToIndex.size > 0 ? beginCell().storeDictDirect(source.nameToIndex, Dictionary.Keys.BigUint(256), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.capabilityIndex.size > 0 ? beginCell().storeDictDirect(source.capabilityIndex, Dictionary.Keys.BigUint(256), Dictionary.Values.Cell()).endCell() : null);
    builder.writeCell(source.openDisputes.size > 0 ? beginCell().storeDictDirect(source.openDisputes, Dictionary.Keys.Uint(32), Dictionary.Values.Address()).endCell() : null);
    builder.writeCell(source.disputeDepositors.size > 0 ? beginCell().storeDictDirect(source.disputeDepositors, Dictionary.Keys.Uint(32), Dictionary.Values.Address()).endCell() : null);
    builder.writeCell(source.disputeBeneficiaries.size > 0 ? beginCell().storeDictDirect(source.disputeBeneficiaries, Dictionary.Keys.Uint(32), Dictionary.Values.Address()).endCell() : null);
    builder.writeCell(source.disputeAmounts.size > 0 ? beginCell().storeDictDirect(source.disputeAmounts, Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257)).endCell() : null);
    builder.writeCell(source.disputeDeadlines.size > 0 ? beginCell().storeDictDirect(source.disputeDeadlines, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.disputeSettled.size > 0 ? beginCell().storeDictDirect(source.disputeSettled, Dictionary.Keys.Uint(32), Dictionary.Values.Bool()).endCell() : null);
    builder.writeNumber(source.disputeCount);
    builder.writeNumber(source.cleanupCursor);
    builder.writeCell(source.intents.size > 0 ? beginCell().storeDictDirect(source.intents, Dictionary.Keys.Uint(32), Dictionary.Values.Address()).endCell() : null);
    builder.writeCell(source.intentServiceHashes.size > 0 ? beginCell().storeDictDirect(source.intentServiceHashes, Dictionary.Keys.Uint(32), Dictionary.Values.BigUint(256)).endCell() : null);
    builder.writeCell(source.intentBudgets.size > 0 ? beginCell().storeDictDirect(source.intentBudgets, Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257)).endCell() : null);
    builder.writeCell(source.intentDeadlines.size > 0 ? beginCell().storeDictDirect(source.intentDeadlines, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.intentStatuses.size > 0 ? beginCell().storeDictDirect(source.intentStatuses, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8)).endCell() : null);
    builder.writeCell(source.intentAcceptedOffer.size > 0 ? beginCell().storeDictDirect(source.intentAcceptedOffer, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeNumber(source.intentCount);
    builder.writeCell(source.intentsByService.size > 0 ? beginCell().storeDictDirect(source.intentsByService, Dictionary.Keys.BigUint(256), Dictionary.Values.Cell()).endCell() : null);
    builder.writeCell(source.offers.size > 0 ? beginCell().storeDictDirect(source.offers, Dictionary.Keys.Uint(32), Dictionary.Values.Address()).endCell() : null);
    builder.writeCell(source.offerIntents.size > 0 ? beginCell().storeDictDirect(source.offerIntents, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.offerPrices.size > 0 ? beginCell().storeDictDirect(source.offerPrices, Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257)).endCell() : null);
    builder.writeCell(source.offerDeliveryTimes.size > 0 ? beginCell().storeDictDirect(source.offerDeliveryTimes, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.offerStatuses.size > 0 ? beginCell().storeDictDirect(source.offerStatuses, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8)).endCell() : null);
    builder.writeNumber(source.offerCount);
    builder.writeNumber(source.intentCleanupCursor);
    builder.writeCell(source.agentActiveIntents.size > 0 ? beginCell().storeDictDirect(source.agentActiveIntents, Dictionary.Keys.Address(), Dictionary.Values.BigInt(257)).endCell() : null);
    builder.writeNumber(source.maxIntentsPerAgent);
    return builder.build();
}

export function dictValueParserReputation$Data(): DictionaryValue<Reputation$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeReputation$Data(src)).endCell());
        },
        parse: (src) => {
            return loadReputation$Data(src.loadRef().beginParse());
        }
    }
}

 type Reputation_init_args = {
    $$type: 'Reputation_init_args';
    owner: Address;
}

function initReputation_init_args(src: Reputation_init_args) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
    };
}

async function Reputation_init(owner: Address) {
    const __code = Cell.fromHex('b5ee9c724102ac010035cc00022cff008e88f4a413f4bcf2c80bed53208e8130e1ed43d9013d020271021902012003080201200406033fb731bda89a1a400031d0ff4800203a3b679c61bb678ae20be1eae20be1ed88303e400500045612033fb7a7bda89a1a400031d0ff4800203a3b679c61bb678ae20be1eae20be1ed88303e400700045621020120090c03f3b7431da89a1a400031d0ff4800203a3b679c61a224622482246224422462244224222442242224022422240223e2240223e223c223e223c223a223c223a2238223a2238223622382236223422362234223222342232223022322230222e2230222e222c222e222c222a222c222a2228222a222822262228222703e400a01481112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f6c410b002c8307561c0280204133f40e6fa19401d70130925b6de20201480d1003f3ad98f6a268690000c743fd200080e8ed9e7186889188920891889108918891089088910890889008908890088f8890088f888f088f888f088e888f088e888e088e888e088d888e088d888d088d888d088c888d088c888c088c888c088b888c088b888b088b888b088a888b088a888a088a888a0889888a0889c03e400e01481112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f6c410f001c8307561b0259f40f6fa192306ddf020148111503f1a419da89a1a400031d0ff4800203a3b679c61a224622482246224422462244224222442242224022422240223e2240223e223c223e223c223a223c223a2238223a2238223622382236223422362234223222342232223022322230222e2230222e222c222e222c222a222c222a2228222a22282226222822273e401201741112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f6c41206e92306d99206ef2d0806f256f05e2206e92306dde1301de20c100917f94205623bee292306de0562180202259f40e6fa192306ddf206e925b6de080202056225422434133f40e6fa19401d70130925b6de280202056225422534133f40e6fa19401d70130925b6de280202056225422634133f40e6fa19401d70130925b6de2802056254016711400a64133f40e6fa19401d70030925b6de203206ef2d080236eb39603206ef2d080923370e2226eb39602206ef2d080923270e2216eb39601206ef2d080923170e2246eb39604206ef2d080923470e2103441306f0503f1a701da89a1a400031d0ff4800203a3b679c61a224622482246224422462244224222442242224022422240223e2240223e223c223e223c223a223c223a2238223a2238223622382236223422362234223222342232223022322230222e2230222e222c222e222c222a222c222a2228222a22282226222822273e401601401112111311121111111211111110111111100f11100f550edb3c6ce76ce76c871701e8561180202259f40e6fa192306ddf206ef2d0802e802023784133f40e6fa19401d70130925b6de2206ef2d08080202056125422534133f40e6fa19401d70130925b6de2206ef2d0807080202056125422734133f40e6fa19401d70130925b6de2206eb39631206ef2d0809130e2561480202683071800804133f40e6fa19401d70130925b6de2206ef2d0808020561540178101014133f40e6fa19401d70030925b6de2206ef2d08023c00094f82323be9170e2105644400201201a320201201b2c0201201c290201201d1f033facaf76a268690000c743fd200080e8ed9e7186ed9e2b882f87ab882f87b620c03e401e00022a020148202503f1a785da89a1a400031d0ff4800203a3b679c61a224622482246224422462244224222442242224022422240223e2240223e223c223e223c223a223c223a2238223a2238223622382236223422362234223222342232223022322230222e2230222e222c222e222c222a222c222a2228222a22282226222822273e402101441112111311121111111211111110111111100f11100f550edb3c6caa6caa6caa6c6a2201f6562180202259f40e6fa192306ddf6e99707054700053007021e07080202056225422434133f40e6fa19401d70130925b6de2206eb39631206ef2d0809130e27080202056225422534133f40e6fa19401d70130925b6de2206eb39631206ef2d0809130e27022c2009630a76421a9049131e27080202056225422632301f84133f40e6fa19401d70130925b6de2206eb39631206ef2d0809130e27080202056225422734133f40e6fa19401d70130925b6de2206eb39631206ef2d0809130e27021c2009b30f82321a182015180a904de7023c2009b30f82323a182015180a904de7026c2639325c1149170e2923071de20c0009323c2009170e22400809af82324a18208278d00bc9170e2923072de20c0009326c0009170e29324c2009170e29af82325a18208093a80bc9170e2923073de7f21c2001850060504431303f1a41bda89a1a400031d0ff4800203a3b679c61a224622482246224422462244224222442242224022422240223e2240223e223c223e223c223a223c223a2238223a2238223622382236223422362234223222342232223022322230222e2230222e222c222e222c222a222c222a2228222a22282226222822273e402601401112111311121111111211111110111111100f11100f550edb3c6cf56cf56c652701f02980202259f40e6fa192306ddf206ef2d0808020545a0052404133f40e6fa19401d70130925b6de2206ef2d080298020248101014133f40e6fa19401d70030925b6de2206ef2d0808020545a0052604133f40e6fa19401d70130925b6de2206ef2d0808020544a16784133f40e6fa19401d70130925b6de2280012206ef2d0801034413003f3b30dbb513434800063a1fe9000407476cf38c34448c4490448c4488448c4488448444884484448044844480447c4480447c4478447c4478447444784474447044744470446c4470446c4468446c4468446444684464446044644460445c4460445c4458445c4458445444584454445044544450444c4450444e03e402a01481112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f6c412b001a83072b0259f40f6fa192306ddf0201202d2f033fb3a37b513434800063a1fe9000407476cf38c376cf15c417c3d5c417c3db10603e402e0008f8276f1003f3b0357b513434800063a1fe9000407476cf38c34448c4490448c4488448c4488448444884484448044844480447c4480447c4478447c4478447444784474447044744470446c4470446c4468446c4468446444684464446044644460445c4460445c4458445c4458445444584454445044544450444c4450444e03e403001481112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f6c413100c820c100917f94205623bee2923070e080202056215422334133f40e6fa19401d70130925b6de2206e917f9820206ef2d080c000e2925b70e080202056210350444133f40e6fa19401d70130925b6de2206e925b70e0206ef2d080a76401206ef2d080a904020120333b02016a343803f2ab3eed44d0d200018e87fa400101d1db3ce30d112311241123112211231122112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411133e403501741112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f6c41206e92306d99206ef2d0806f266f06e2206e92306dde3601f620c100917f94205614bee292306de0561980202259f40e6fa192306ddf206e925b6de05615802023714133f40e6fa19401d70030925b6de201206ef2d080561a80202459f40e6fa192306ddf206ef2d080561a80202559f40e6fa192306ddf206ef2d080561a8020268101014133f40e6fa19401d70030925b6de237006c206ef2d080802020561c0350884133f40e6fa19401d70130925b6de2206ef2d080246eb39604206ef2d080923470e210354430126f0603f2a9b4ed44d0d200018e87fa400101d1db3ce30d112311241123112211231122112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411133e403901481112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f6c413a004681010b23028101014133f40a6fa19401d70030925b6de2206eb395206ef2d080e03070033fb42a3da89a1a400031d0ff4800203a3b679c61bb678ae20be1eae20be1ed88303e403c00022304a0eda2edfb01d072d721d200d200fa4021103450666f04f86102f862ed44d0d200018e87fa400101d1db3ce30d1125965f0f5f0f5f07e01123d70d1ff2e08221821038a0a307bae302218210a7262e8eba3e40434a01f46d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d8208989680705470005300061121060511200506111f0605111e0506111d0605111c0506111b0605111a0506111906051118050611170605111605061115060511140506111306051112050411110403111003106f105e104d103c106b105a3f00141029104810374104037a01f8db3c5724112211231122112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550e4101ecfa40fa00d31ff404d401d0f404f404f404d430d0f404f404f404d430d0f404f404f404d430d0f404f404f404d430d0f404d31fd31ff404f404d430d0f404f404f404d430d0f404d31ff404f404d430d0f404f404f404d430d0f404d31fd31ff404d3073011201124112011201123112011201122112042000c11201121112003f631d401d001d431d200308160adf8416f24135f035624bef2f4019b9320d74a91d5e868f90400da11561a83072280204133f40e6fa19401d70130925b6de2206eb3e30f112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a111b1118111a111844454700d431206ef2d080562080202259f40e6fa192306ddf817b16216eb39bf84202206ef2d08012c705923170e2f2f401111f0180205110112171216e955b59f45b3098c801cf004133f443e28020f8232104111d04102302112102216e955b59f45b3098c801cf014133f443e201fe3056218020f84202112302562301206e953059f45b30944133f416e2011120018020015622500471216e955b59f45b3098c801cf004133f443e28020702103112103562359216e955b59f45b3098c801cf014133f443e28020702103112003562359216e955b59f45b3098c801cf014133f443e28020f8232103111f0356234600e659216e955b59f45b3098c801cf014133f443e28020f8232103111e03562359216e955b59f45b3098c801cf014133f443e202111a028307020111200111218020216e955b59f45b3098c801cf014133f443e2111fa4111f111c111d111c111b111c111b111a111b111a1119111a11191118111904fe1117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a1079106810571046103544301272db3cf842708042708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf818ae276488f490028000000004167656e7420726567697374657265640178f400c901fb00c87f01ca0011241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54a902fc8efa31d401d001d200308160adf8416f24135f035624bef2f4019b9320d74a91d5e868f90400da118307561b0280204133f40e6fa19401d70130925b6de2816cce216eb3f2f4206ef2d08080202056205422334133f40e6fa19401d70130925b6de2206e95816ccef2f0de802001206ef2d080a42103112103562159e0214b4f01fc216e955b59f45b3098c801cf014133f443e2018e3b80205300561f595621014133f40e6fa19401d70130925b6de2206ef2d080a42103111f03562059216e955b59f45b3098c801cf014133f443e2111cde8020f8232104111d04102302112002216e955b59f45b3098c801cf014133f443e21121112311211120112211204c01fc111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a111b1118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035443012714d03ecdb3cf842708042708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00c87f01ca0011241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54764ea9002600000000526174696e67207265636f72646564044a821054e26a4bbae302218210148534b8bae3022182108711bf6fbae3022182102f7e5059ba5054585b01fc31d401d001d20030019b9320d74a91d5e868f90400da118307561b0280204133f40e6fa19401d70130925b6de2816cce216eb3f2f4206ef2d080562080202259f40e6fa192306ddf820097a4216eb39bf84202206ef2d08012c705923170e2f2f401111f0180205110112171216e955b59f45b3098c801cf004133f443e25102fa8020f8232104111d04102302112102216e955b59f45b3098c801cf014133f443e2f842708042708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00112111231121112011221120111f1121111f111e1120111e111d111f111d5253003000000000417661696c6162696c697479207570646174656401d6111c111e111c111b111d111b111a111c111a111b1118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035443012a801f831d31fd3ff30562080202359f40e6fa192306ddf816cce216eb3f2f4811bd6f84202206ef2d08012c705f2f48020f8232103111e032459216e955b59f45b3098c801cf014133f443e256198307561d59f40f6fa192306ddfc813cb1f226eb39c7101cb0002206ef2d08058cc95327058cb00e2830701c903111a03125502f401111c01206e953059f45b30944133f417e2f842708042708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b5657002c000000004361706162696c69747920696e646578656401be111a111c111a1119111b11191118111a111811191116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035443012a801fe31d3073020c23293308032de20c101923071de112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311115903ce1110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035443012db3cf842708042708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00765aa8002a00000000436c65616e757020636f6d706c6574656402fe8efc31fa40fa40fa40fa00d31f3001111b0180200156165006206e953059f45b30944133f416e20111190180200156155004206e953059f45b30944133f416e201111701802001561401111a206e953059f45b30944133f416e201111501802001561301111a810101216e955b59f45b3098c801cf004133f443e2802020e05c5e01f80311150312561302111701216e955b59f45b3098c801cf014133f443e21111802056117071216e955b59f45b3098c801cf004133f443e21110a4112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911175d01c011141118111411151117111511131115111311111114111111101113111011120f11110f0e11100e551dc87f01ca0011241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54a9044c218210bfa05986bae3022182102365d020bae302218210966dc6edbae3022182106d5af6a7ba5f63668b02fa31fa40307094205613b98ea1561880202259f40e6fa192306ddf206eb398206ef2d08022c705923070e2e302a4e85b112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a1118111711191117111611181116111511171115606201fc31011112018020017f71216e955b59f45b3098c801cf004133f443e2112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a111811171119111711161118111611151117111511141116111411131115111311121114111211136101be1110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035443012c87f01ca0011241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54db31a901c01114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df551cc87f01ca0011241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54a902fa5b8168c9f8425623c705f2f47081008270885625553010246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a6465002400000000466565732077697468647261776e01fc1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df551cc87f01ca0011241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54a902fc31d3fffa00d31f30811127f8235220bcf2f48159c222c200f2f47081010bf8425628598101014133f40a6fa19401d70030925b6de2206eb39631206ef2d0809130e2205628bee3008020f8420211140252e0206e953059f45b30944133f416e21111802053d48307216e955b59f45b3098c801cf014133f443e201111001676e01f4f842112411261124112311251123112211261122112111251121112011261120111f1125111f111e1126111e111d1125111d111c1126111c111b1125111b111a1126111a1119112511191118112611181117112511171116112611161115112511151114112611141113112511131112112611121111112511116802f81110112611100f11250f0e11260e0d11250d0c11260c0b11250b0a11260a091125090811260807112507061126060511250504112604031125030211270201112801db3c8e2a572781010bf84222598101014133f40a6fa19401d70030925b6de2206eb395206ef2d080923070e21127de811d38562822b9f2f41127696c012ceda2edfb70209a21c13293530db99170e28ae85f03706a02fe561380202259f40e6fa192306ddf5610802023784133f40e6fa19401d70130925b6de2216eb39901206ef2d08024c705923170e293206eb39170e297206ef2d080c000923070e28eb280202056125422334133f40e6fa19401d70130925b6de2206eb399f82301206ef2d080be923070e28e876c21db3c7fdb31e0dea401a4806b00020101f801112601112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211106d00400f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035102401fe80205420d4810101216e955b59f45b3098c801cf004133f443e280202003111003544d13111201216e955b59f45b3098c801cf014133f443e20c80202b7078216e955b59f45b3098c801cf014133f443e22aa481010bf8421113a4031127031201111301810101216e955b59f4593098c801cf004133f441e21123112511236f01fc112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311110f11120f5e3d10cf10ce10bd109b108a10797004301068105710461035441302db3cdb3c71db3cf8427080427071727689007a2b83072359f40f6fa192306ddfc812cb1f216eb39c7101cb0001206ef2d08001cc947032cb00e2830701c9103c12206e953059f45b30944133f417e20901e8eda2edfb22709a20c10593531cb99170e28ed42e802023784133f40e6fa19401d70130925b6de2206eb397206ef2d080c000923070e28eaa80202056115422434133f40e6fa19401d70130925b6de2206eb399f82301206ef2d080be923070e2e302de01a401a4e83033532abe9232709102e2027301fa30112311241123112211241122112111241121112011241120111f1124111f111e1124111e111d1124111d111c1124111c111b1124111b111a1124111a1119112411191118112411181117112411171116112411161115112411151114112411141113112411131112112411121111112411111110112411100f11240f7402f60e11240e0d11240d0c11240c0b11240b0a11240a09112409112408070655405624db3c321123a4112211231122112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611158075007c1114111511141113111411131112111311121111111211111110111111100f11100f10ef10de10cd10bc10ab109a1089107810671056104510344033db310188702056148e1221c10a94205626b99170e2935323b99170e28e96562480202259f40e6fa192306ddf6eb3e300a401a401e857155f0356115622be93571170921111e211117701fc7080202056255422434133f40e6fa19401d70130925b6de280202056255422534133f40e6fa19401d70130925b6de280202056245422634133f40e6fa19401d70130925b6de280202056265422734133f40e6fa19401d70130925b6de270246eb3983003206ef2d080039134e270236eb3983002206ef2d080029133e2237801ecc2639c02a76423a904c114927f34de9132e223b393206eb39170e29820206ef2d080c2009170e28e13f82301206ef2d080a18208278d00bc927f33de9130e222b39301c000923170e293206eb39170e29820206ef2d080c2009170e28e13f82301206ef2d080a18208093a80bc92307fde9130e2e3007901f8112311271123112211261122112111251121112011241120111f1127111f111e1126111e111d1125111d111c1124111c111b1127111b111a1126111a1119112511191118112411181117112711171116112611161115112511151114112411141113112711131112112611121111112511111110112411100f11270f7a02fa0e11260e0d11250d0c11240c0b11270b0a11260a09112509081124080711270706112606051125050411240403112703021126020111250111245624db3c1126a4112311271123112211261122112111251121112011241120111f1123111f111e1122111e111d1121111d111c1120111c111b111f111b111a111e111a7b8801f6562180202259f40e6fa192306ddf11228020226d206e953059f45b30944133f416e211218020226d71216e955b59f45b3098c801cf004133f443e280206d21031123032459216e955b59f45b3098c801cf014133f443e280206d21031122032459216e955b59f45b3098c801cf014133f443e280206d21031121037c01b62459216e955b59f45b3098c801cf014133f443e280206d2104112004102302112002216e955b59f45b3098c801cf014133f443e256216eb3925721e30d111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b7d03fe70209a531db99320c1149170e28ed2561380202359f40e6fa192306ddf5610802024784133f40e6fa19401d70130925b6de2216eb39f01206ef2d0805625206ef2d080c705923170e293206eb39170e297206ef2d080c000923070e2e30001a401e85b70209a5316b99320c11e9170e28ae85b81010b1122206ef2d08010237e868701f8112311261123112211251122112111241121112011251120111f1124111f111e1125111e111d1124111d111c1125111c02111b02111a1124111a111911251119021118021117112411171116112511160211150211141124111411131125111302111202111111241111111011251110102f0e11240e0d11250d102c7f02fa0b11240b0a11250a10290811240807112507102605112405041125041023021124020111250111245625db3c1124a4112311261123112211251122112111241121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111a111d111a1119111c11191118111b11181117111a1117111611191116808502c62d802022784133f40e6fa19401d70130925b6de2206e92307f97206ef2d080c300e29130e0561180202259f40e6fa192306ddf0e8020227478216e955b59f45b3098c801cf014133f443e22e6eb3913ee30d70209a5316b99320c1149170e28ae85f03818401fc0e206ef2d080112411251124112311251123112211251122112111251121112011251120111f1125111f111e1125111e111d1125111d111c1125111c111b1125111b111a1125111a1119112511191118112511181117112511171116112511161115112511151114112511141113112511131112112511121111112511118202f41110112511100f11250f0e11250e0d11250d0c11250c0b11250b0a11250a091125090811250807112507061125060511250504112504031125030211250201112501db3c112311241123112211231122112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111ba2830090111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550e00da8020545b0052404133f40e6fa19401d70130925b6de228802024784133f40e6fa19401d70130925b6de2216eb39801206ef2d08024ba923170e293206eb39170e297206ef2d080c000923070e28e1a078020227378216e955b59f45b3098c801cf014133f443e207a4de01a40100901115111811151114111711141113111611131112111511121111111411111110111311100f11120f0e11110e0d11100d10cf10be10ad109c108b107a10691058104710364540102300d62b80202359f40e6fa192306ddf28802024784133f40e6fa19401d70130925b6de2216eb39f01206ef2d0805625206ef2d080c705923170e293206eb39170e297206ef2d080c000923070e28e1a078020227378216e955b59f45b3098c801cf014133f443e207a4de01a4010036011122016d810101216e955b59f4593098c801cf004133f441e20100c41119111d11191118111c11181117111b11171116111a11161115111911151114111811141113111711131112111611121111111511111110111411100f11130f0e11120e0d11110d0c11100c10bf10ae109d108c107b106a1059104810374016505402dc8810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00c87f01ca0011241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed548aa9002800000000496e74656e742062726f61646361737402fe8efc31d31ffa00d31f302d802024784133f40e6fa19401d70130925b6de2813404216eb3f2f481680001206ef2d080c000f2f48020545f0052504133f40e6fa19401d70130925b6de28200bc90216eb39af82302206ef2d08012b9923170e2f2f42f8020248101014133f40e6fa19401d70030925b6de282008b73216eb3e08c9201e69901206ef2d0805230bb923170e2f2f4561180202459f40e6fa192306ddf820087fa216eb39cf84202206ef2d08012c705b3923170e2f2f48020f84226103c01206e953059f45b30944133f416e2802020103a5446135055216e955b59f45b3098c801cf014133f443e21680205420498101018d03fe216e955b59f45b3098c801cf004133f443e2802020103654441350aa216e955b59f45b3098c801cf014133f443e2028020227078216e955b59f45b3098c801cf014133f443e201a4f842708042708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf818ae2f400c901fb001121112311218e8f90001c000000004f666665722073656e74001a58cf8680cf8480f400f400cf8101fc112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a10795e3491017445135042c87f01ca0011241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54a9044c2182103785158dbae3022182101ce33d8ebae3022182103b9b249ebae302018210946a98b6ba939a9fa601f631d31f3023802022784133f40e6fa19401d70130925b6de28200c723216eb3f2f48200b1bf01206ef2d080c000f2f4802054570052304133f40e6fa19401d70130925b6de282009d3e216eb3f2f4802021206ef2d08056125959f40e6fa192306ddf815730216eb39af84222206ef2d080c7059170e2f2f48020229401f6206ef2d0802f59784133f40e6fa19401d70130925b6de2816800216eb39801206ef2d080c000923170e2f2f4802022206ef2d08021561155204133f40e6fa19401d70130925b6de28200bc90216eb39af82302206ef2d08012b9923170e2f2f4058020237178216e955b59f45b3098c801cf014133f443e28020229504fa206ef2d080102f7178216e955b59f45b3098c801cf014133f443e2802022206ef2d08021103f5250216e955b59f45b3098c801cf014133f443e2256eb38e9e05206ef2d08010cd105c0211250201112601db3c112501112401104c104b9135e270935304b98ae85f03f842708042708810246d50436d03c8cf8580ca00a296979800ea5302bd8e6e802054590052304133f40e6fa19401d70130925b6de22e802023784133f40e6fa19401d70130925b6de2216eb39d01206ef2d08023206ef2d080ba923170e293206eb39170e297206ef2d080c000923070e28e190d80202e7278216e955b59f45b3098c801cf014133f443e20ddedea40024000000004f6666657220616363657074656402fc89cf16ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611149d9901d81113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd109c102b108a10791068105710465a15c87f01ca0011241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54a902fe31d31f302b802022784133f40e6fa19401d70130925b6de2813404216eb3f2f482009b6f01206ef2d080c001f2f42f80202259f40e6fa192306ddf815730216eb39bf84202206ef2d08012c705923170e2f2f41b8020017278216e955b59f45b3098c801cf014133f443e2f842708042708810246d50436d03c8cf8580ca009b9c0020000000004465616c20736574746c656402fc89cf16ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611149d9e00011001da1113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd0c109b108a107910681057104610354403c87f01ca0011241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54a901fe31d31f302b802022784133f40e6fa19401d70130925b6de2813404216eb3f2f48200cd2501206ef2d080c000f2f42f80202259f40e6fa192306ddf815730216eb39bf84202206ef2d08012c705923170e2f2f40b80202c7378216e955b59f45b3098c801cf014133f443e2f842112311241123112211231122112111221121a001fc112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f10ef1d1e10bc10ab109a10891078106710561045a102fc1034413001112501db3c70935304b98e6b802054590052304133f40e6fa19401d70130925b6de226802023784133f40e6fa19401d70130925b6de2216eb39901206ef2d0805627ba923170e293206eb39170e297206ef2d080c000923070e28e19058020267278216e955b59f45b3098c801cf014133f443e205dea4e830a2a3009c2281010b228101014133f40a6fa19401d70030925b6de2206eb39820206ef2d080c2009170e28e2381010b01206ef2d080a5103412810101216e955b59f4593098c801cf004133f441e201915be202f85724f842708042708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00112211231122112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a1119a4a5002800000000496e74656e742063616e63656c6c656401e41118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550ec87f01ca0011241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54a902fe8efdd33f30c8018210aff90f5758cb1fcb3fc9112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a1118111711191117111611181116111511171115111411161114111311151113111211141112111111131111a7ab01941110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035443012f84270705003804201503304c8cf8580ca00cf8440ce01fa02806acf40f400c901fb00a8016cc87f01ca0011241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54a901f4011123011124ce011121fa0201111f01cb1f01111d01f400111bc8f40001111a01f40001111801f4001116c8f40001111501f40001111301f4001111c8f40001111001f4001ef4000cc8f4001bf40019f40007c8f40016cb1f14cb1f12f400f40001c8f40012f40013f40003c8f40015cb1f15f40016f40006c8aa004ef40018f40018f40009c8f4001acb1f1acb1f1af4001acb0715cd18cd16cd13cd14cd14cdcdcdcd0014e05f0f5f0f5f07f2c082682c47a5');
    const builder = beginCell();
    builder.storeUint(0, 1);
    initReputation_init_args({ $$type: 'Reputation_init_args', owner })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

export const Reputation_errors = {
    2: { message: "Stack underflow" },
    3: { message: "Stack overflow" },
    4: { message: "Integer overflow" },
    5: { message: "Integer out of expected range" },
    6: { message: "Invalid opcode" },
    7: { message: "Type check error" },
    8: { message: "Cell overflow" },
    9: { message: "Cell underflow" },
    10: { message: "Dictionary error" },
    11: { message: "'Unknown' error" },
    12: { message: "Fatal error" },
    13: { message: "Out of gas error" },
    14: { message: "Virtualization error" },
    32: { message: "Action list is invalid" },
    33: { message: "Action list is too long" },
    34: { message: "Action is invalid or not supported" },
    35: { message: "Invalid source address in outbound message" },
    36: { message: "Invalid destination address in outbound message" },
    37: { message: "Not enough Toncoin" },
    38: { message: "Not enough extra currencies" },
    39: { message: "Outbound message does not fit into a cell after rewriting" },
    40: { message: "Cannot process a message" },
    41: { message: "Library reference is null" },
    42: { message: "Library change action error" },
    43: { message: "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree" },
    50: { message: "Account state size exceeded limits" },
    128: { message: "Null reference exception" },
    129: { message: "Invalid serialization prefix" },
    130: { message: "Invalid incoming message" },
    131: { message: "Constraints error" },
    132: { message: "Access denied" },
    133: { message: "Contract stopped" },
    134: { message: "Invalid argument" },
    135: { message: "Code of a contract was not found" },
    136: { message: "Invalid standard address" },
    138: { message: "Not a basechain address" },
    4391: { message: "Deadline must be in the future" },
    7126: { message: "Not the agent owner" },
    7480: { message: "Max intents reached. Cancel or wait for expiration." },
    13316: { message: "Intent not found" },
    22320: { message: "Not the intent owner" },
    22978: { message: "Budget must be positive" },
    24749: { message: "Insufficient fee. Send at least 0.01 TON." },
    26624: { message: "Intent not open" },
    26825: { message: "Only owner can withdraw" },
    27854: { message: "Agent not found" },
    31510: { message: "Only the agent owner can update" },
    34810: { message: "Cannot offer on own intent" },
    35699: { message: "Price exceeds budget" },
    38820: { message: "Only the agent owner can update availability" },
    39791: { message: "Intent not in accepted state" },
    40254: { message: "Offer has no intent" },
    45503: { message: "Offer not pending" },
    48272: { message: "Intent expired" },
    50979: { message: "Offer not found" },
    52517: { message: "Can only cancel open intents" },
} as const

export const Reputation_errors_backward = {
    "Stack underflow": 2,
    "Stack overflow": 3,
    "Integer overflow": 4,
    "Integer out of expected range": 5,
    "Invalid opcode": 6,
    "Type check error": 7,
    "Cell overflow": 8,
    "Cell underflow": 9,
    "Dictionary error": 10,
    "'Unknown' error": 11,
    "Fatal error": 12,
    "Out of gas error": 13,
    "Virtualization error": 14,
    "Action list is invalid": 32,
    "Action list is too long": 33,
    "Action is invalid or not supported": 34,
    "Invalid source address in outbound message": 35,
    "Invalid destination address in outbound message": 36,
    "Not enough Toncoin": 37,
    "Not enough extra currencies": 38,
    "Outbound message does not fit into a cell after rewriting": 39,
    "Cannot process a message": 40,
    "Library reference is null": 41,
    "Library change action error": 42,
    "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree": 43,
    "Account state size exceeded limits": 50,
    "Null reference exception": 128,
    "Invalid serialization prefix": 129,
    "Invalid incoming message": 130,
    "Constraints error": 131,
    "Access denied": 132,
    "Contract stopped": 133,
    "Invalid argument": 134,
    "Code of a contract was not found": 135,
    "Invalid standard address": 136,
    "Not a basechain address": 138,
    "Deadline must be in the future": 4391,
    "Not the agent owner": 7126,
    "Max intents reached. Cancel or wait for expiration.": 7480,
    "Intent not found": 13316,
    "Not the intent owner": 22320,
    "Budget must be positive": 22978,
    "Insufficient fee. Send at least 0.01 TON.": 24749,
    "Intent not open": 26624,
    "Only owner can withdraw": 26825,
    "Agent not found": 27854,
    "Only the agent owner can update": 31510,
    "Cannot offer on own intent": 34810,
    "Price exceeds budget": 35699,
    "Only the agent owner can update availability": 38820,
    "Intent not in accepted state": 39791,
    "Offer has no intent": 40254,
    "Offer not pending": 45503,
    "Intent expired": 48272,
    "Offer not found": 50979,
    "Can only cancel open intents": 52517,
} as const

const Reputation_types: ABIType[] = [
    {"name":"DataSize","header":null,"fields":[{"name":"cells","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bits","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"refs","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"SignedBundle","header":null,"fields":[{"name":"signature","type":{"kind":"simple","type":"fixed-bytes","optional":false,"format":64}},{"name":"signedData","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounceable","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"MessageParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"DeployParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"init","type":{"kind":"simple","type":"StateInit","optional":false}}]},
    {"name":"StdAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":8}},{"name":"address","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"VarAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":32}},{"name":"address","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"BasechainAddress","header":null,"fields":[{"name":"hash","type":{"kind":"simple","type":"int","optional":true,"format":257}}]},
    {"name":"Deploy","header":2490013878,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DeployOk","header":2952335191,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"FactoryDeploy","header":1829761339,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"cashback","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"Register","header":950051591,"fields":[{"name":"name","type":{"kind":"simple","type":"string","optional":false}},{"name":"capabilities","type":{"kind":"simple","type":"string","optional":false}},{"name":"available","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"Rate","header":2804297358,"fields":[{"name":"agentName","type":{"kind":"simple","type":"string","optional":false}},{"name":"success","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"UpdateAvailability","header":1424124491,"fields":[{"name":"name","type":{"kind":"simple","type":"string","optional":false}},{"name":"available","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"Withdraw","header":593874976,"fields":[]},
    {"name":"IndexCapability","header":344274104,"fields":[{"name":"agentIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"capabilityHash","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"TriggerCleanup","header":2266087279,"fields":[{"name":"maxClean","type":{"kind":"simple","type":"uint","optional":false,"format":8}}]},
    {"name":"NotifyDisputeOpened","header":796807257,"fields":[{"name":"escrowAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"depositor","type":{"kind":"simple","type":"address","optional":false}},{"name":"beneficiary","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"votingDeadline","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"NotifyDisputeSettled","header":3214956934,"fields":[{"name":"escrowAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"released","type":{"kind":"simple","type":"bool","optional":false}},{"name":"refunded","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"BroadcastIntent","header":2523776749,"fields":[{"name":"serviceHash","type":{"kind":"simple","type":"uint","optional":false,"format":256}},{"name":"budget","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"deadline","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"SendOffer","header":1834677927,"fields":[{"name":"intentIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"price","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"deliveryTime","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"AcceptOffer","header":931468685,"fields":[{"name":"offerIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"CancelIntent","header":1000023198,"fields":[{"name":"intentIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"SettleDeal","header":484654478,"fields":[{"name":"intentIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"rating","type":{"kind":"simple","type":"uint","optional":false,"format":8}}]},
    {"name":"AgentData","header":null,"fields":[{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"available","type":{"kind":"simple","type":"bool","optional":false}},{"name":"totalTasks","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"successes","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"registeredAt","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"DisputeInfo","header":null,"fields":[{"name":"escrowAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"depositor","type":{"kind":"simple","type":"address","optional":false}},{"name":"beneficiary","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"votingDeadline","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"settled","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"AgentCleanupInfo","header":null,"fields":[{"name":"index","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"exists","type":{"kind":"simple","type":"bool","optional":false}},{"name":"score","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"totalRatings","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"registeredAt","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"lastActive","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"daysSinceActive","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"daysSinceRegistered","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"eligibleForCleanup","type":{"kind":"simple","type":"bool","optional":false}},{"name":"cleanupReason","type":{"kind":"simple","type":"uint","optional":false,"format":8}}]},
    {"name":"IntentData","header":null,"fields":[{"name":"buyer","type":{"kind":"simple","type":"address","optional":false}},{"name":"serviceHash","type":{"kind":"simple","type":"uint","optional":false,"format":256}},{"name":"budget","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"deadline","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"status","type":{"kind":"simple","type":"uint","optional":false,"format":8}},{"name":"acceptedOffer","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"isExpired","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"OfferData","header":null,"fields":[{"name":"seller","type":{"kind":"simple","type":"address","optional":false}},{"name":"intentIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"price","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"deliveryTime","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"status","type":{"kind":"simple","type":"uint","optional":false,"format":8}}]},
    {"name":"Reputation$Data","header":null,"fields":[{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"fee","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"agentCount","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"agentOwners","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"agentAvailable","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"bool"}},{"name":"agentTotalTasks","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"agentSuccesses","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"agentRegisteredAt","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"agentLastActive","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"nameToIndex","type":{"kind":"dict","key":"uint","keyFormat":256,"value":"uint","valueFormat":32}},{"name":"capabilityIndex","type":{"kind":"dict","key":"uint","keyFormat":256,"value":"cell","valueFormat":"ref"}},{"name":"openDisputes","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"disputeDepositors","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"disputeBeneficiaries","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"disputeAmounts","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"int"}},{"name":"disputeDeadlines","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"disputeSettled","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"bool"}},{"name":"disputeCount","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"cleanupCursor","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"intents","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"intentServiceHashes","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":256}},{"name":"intentBudgets","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"int"}},{"name":"intentDeadlines","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"intentStatuses","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":8}},{"name":"intentAcceptedOffer","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"intentCount","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"intentsByService","type":{"kind":"dict","key":"uint","keyFormat":256,"value":"cell","valueFormat":"ref"}},{"name":"offers","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"offerIntents","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"offerPrices","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"int"}},{"name":"offerDeliveryTimes","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"offerStatuses","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":8}},{"name":"offerCount","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"intentCleanupCursor","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"agentActiveIntents","type":{"kind":"dict","key":"address","value":"int"}},{"name":"maxIntentsPerAgent","type":{"kind":"simple","type":"uint","optional":false,"format":8}}]},
]

const Reputation_opcodes = {
    "Deploy": 2490013878,
    "DeployOk": 2952335191,
    "FactoryDeploy": 1829761339,
    "Register": 950051591,
    "Rate": 2804297358,
    "UpdateAvailability": 1424124491,
    "Withdraw": 593874976,
    "IndexCapability": 344274104,
    "TriggerCleanup": 2266087279,
    "NotifyDisputeOpened": 796807257,
    "NotifyDisputeSettled": 3214956934,
    "BroadcastIntent": 2523776749,
    "SendOffer": 1834677927,
    "AcceptOffer": 931468685,
    "CancelIntent": 1000023198,
    "SettleDeal": 484654478,
}

const Reputation_getters: ABIGetter[] = [
    {"name":"agentData","methodId":92172,"arguments":[{"name":"index","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"AgentData","optional":true}},
    {"name":"agentIndexByNameHash","methodId":88600,"arguments":[{"name":"nameHash","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"int","optional":true,"format":257}},
    {"name":"agentReputation","methodId":110805,"arguments":[{"name":"index","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"agentCount","methodId":81213,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"contractBalance","methodId":110221,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"agentsByCapability","methodId":90929,"arguments":[{"name":"capHash","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"cell","optional":true}},
    {"name":"disputeCount","methodId":72077,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"disputeData","methodId":119614,"arguments":[{"name":"index","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"DisputeInfo","optional":true}},
    {"name":"agentCleanupInfo","methodId":100802,"arguments":[{"name":"index","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"AgentCleanupInfo","optional":false}},
    {"name":"intentsByServiceHash","methodId":105526,"arguments":[{"name":"serviceHash","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"cell","optional":true}},
    {"name":"intentCount","methodId":98654,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"offerCount","methodId":123217,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"agentIntentQuota","methodId":120244,"arguments":[{"name":"agent","type":{"kind":"simple","type":"address","optional":false}}],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"intentData","methodId":93056,"arguments":[{"name":"index","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"IntentData","optional":false}},
    {"name":"offerData","methodId":100877,"arguments":[{"name":"index","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"OfferData","optional":false}},
]

export const Reputation_getterMapping: { [key: string]: string } = {
    'agentData': 'getAgentData',
    'agentIndexByNameHash': 'getAgentIndexByNameHash',
    'agentReputation': 'getAgentReputation',
    'agentCount': 'getAgentCount',
    'contractBalance': 'getContractBalance',
    'agentsByCapability': 'getAgentsByCapability',
    'disputeCount': 'getDisputeCount',
    'disputeData': 'getDisputeData',
    'agentCleanupInfo': 'getAgentCleanupInfo',
    'intentsByServiceHash': 'getIntentsByServiceHash',
    'intentCount': 'getIntentCount',
    'offerCount': 'getOfferCount',
    'agentIntentQuota': 'getAgentIntentQuota',
    'intentData': 'getIntentData',
    'offerData': 'getOfferData',
}

const Reputation_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"typed","type":"Register"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Rate"}},
    {"receiver":"internal","message":{"kind":"typed","type":"UpdateAvailability"}},
    {"receiver":"internal","message":{"kind":"typed","type":"IndexCapability"}},
    {"receiver":"internal","message":{"kind":"typed","type":"TriggerCleanup"}},
    {"receiver":"internal","message":{"kind":"typed","type":"NotifyDisputeOpened"}},
    {"receiver":"internal","message":{"kind":"typed","type":"NotifyDisputeSettled"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Withdraw"}},
    {"receiver":"internal","message":{"kind":"typed","type":"BroadcastIntent"}},
    {"receiver":"internal","message":{"kind":"typed","type":"SendOffer"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AcceptOffer"}},
    {"receiver":"internal","message":{"kind":"typed","type":"SettleDeal"}},
    {"receiver":"internal","message":{"kind":"typed","type":"CancelIntent"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Deploy"}},
]


export class Reputation implements Contract {
    
    public static readonly storageReserve = 0n;
    public static readonly errors = Reputation_errors_backward;
    public static readonly opcodes = Reputation_opcodes;
    
    static async init(owner: Address) {
        return await Reputation_init(owner);
    }
    
    static async fromInit(owner: Address) {
        const __gen_init = await Reputation_init(owner);
        const address = contractAddress(0, __gen_init);
        return new Reputation(address, __gen_init);
    }
    
    static fromAddress(address: Address) {
        return new Reputation(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  Reputation_types,
        getters: Reputation_getters,
        receivers: Reputation_receivers,
        errors: Reputation_errors,
    };
    
    constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: Register | Rate | UpdateAvailability | IndexCapability | TriggerCleanup | NotifyDisputeOpened | NotifyDisputeSettled | Withdraw | BroadcastIntent | SendOffer | AcceptOffer | SettleDeal | CancelIntent | Deploy) {
        
        let body: Cell | null = null;
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Register') {
            body = beginCell().store(storeRegister(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Rate') {
            body = beginCell().store(storeRate(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'UpdateAvailability') {
            body = beginCell().store(storeUpdateAvailability(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'IndexCapability') {
            body = beginCell().store(storeIndexCapability(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'TriggerCleanup') {
            body = beginCell().store(storeTriggerCleanup(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'NotifyDisputeOpened') {
            body = beginCell().store(storeNotifyDisputeOpened(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'NotifyDisputeSettled') {
            body = beginCell().store(storeNotifyDisputeSettled(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Withdraw') {
            body = beginCell().store(storeWithdraw(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'BroadcastIntent') {
            body = beginCell().store(storeBroadcastIntent(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'SendOffer') {
            body = beginCell().store(storeSendOffer(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AcceptOffer') {
            body = beginCell().store(storeAcceptOffer(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'SettleDeal') {
            body = beginCell().store(storeSettleDeal(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'CancelIntent') {
            body = beginCell().store(storeCancelIntent(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Deploy') {
            body = beginCell().store(storeDeploy(message)).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
    async getAgentData(provider: ContractProvider, index: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(index);
        const source = (await provider.get('agentData', builder.build())).stack;
        const result_p = source.readTupleOpt();
        const result = result_p ? loadTupleAgentData(result_p) : null;
        return result;
    }
    
    async getAgentIndexByNameHash(provider: ContractProvider, nameHash: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(nameHash);
        const source = (await provider.get('agentIndexByNameHash', builder.build())).stack;
        const result = source.readBigNumberOpt();
        return result;
    }
    
    async getAgentReputation(provider: ContractProvider, index: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(index);
        const source = (await provider.get('agentReputation', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getAgentCount(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('agentCount', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getContractBalance(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('contractBalance', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getAgentsByCapability(provider: ContractProvider, capHash: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(capHash);
        const source = (await provider.get('agentsByCapability', builder.build())).stack;
        const result = source.readCellOpt();
        return result;
    }
    
    async getDisputeCount(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('disputeCount', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getDisputeData(provider: ContractProvider, index: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(index);
        const source = (await provider.get('disputeData', builder.build())).stack;
        const result_p = source.readTupleOpt();
        const result = result_p ? loadTupleDisputeInfo(result_p) : null;
        return result;
    }
    
    async getAgentCleanupInfo(provider: ContractProvider, index: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(index);
        const source = (await provider.get('agentCleanupInfo', builder.build())).stack;
        const result = loadGetterTupleAgentCleanupInfo(source);
        return result;
    }
    
    async getIntentsByServiceHash(provider: ContractProvider, serviceHash: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(serviceHash);
        const source = (await provider.get('intentsByServiceHash', builder.build())).stack;
        const result = source.readCellOpt();
        return result;
    }
    
    async getIntentCount(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('intentCount', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getOfferCount(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('offerCount', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getAgentIntentQuota(provider: ContractProvider, agent: Address) {
        const builder = new TupleBuilder();
        builder.writeAddress(agent);
        const source = (await provider.get('agentIntentQuota', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getIntentData(provider: ContractProvider, index: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(index);
        const source = (await provider.get('intentData', builder.build())).stack;
        const result = loadGetterTupleIntentData(source);
        return result;
    }
    
    async getOfferData(provider: ContractProvider, index: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(index);
        const source = (await provider.get('offerData', builder.build())).stack;
        const result = loadGetterTupleOfferData(source);
        return result;
    }
    
}