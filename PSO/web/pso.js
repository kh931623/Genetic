function myRand(l, u) {
    return Math.random() * (u - l) + l;
}

class Config {
    constructor(dim, number, type, coeff = [0.8, 2, 2]) {
        if (arguments.length < 3) {
            throw new Error('Constructor of Config class needs at least 3 arguments!');
        }
        // number of particles
        this.number = number;
        // number of problem dimension
        this.dim = dim;
        // w, c1, c2
        this.coeff = coeff;
        // array of constraints
        this.constraints = [];
        // type = 1 while Maximization
        // type = -1 while Minimization
        this.type = type;
        // penalty coefficients
        this.penalty = [0.5, 2, 2];
    }

    /*
        lower: array, lower bound
        upper: array, upper bound
    */
    setSubject(lower, upper) {
        if (
            lower.length != this.dim ||
            upper.length != this.dim
        ) {
            throw new Error('length of lower and upper bound should fits the problem dimension!');
        }

        this.lower = lower;
        this.upper = upper;
        this.vmax = [];
        for (let i = 0; i < lower.length; i++) {
            this.vmax.push(0.3 * (upper[i] - lower[i]));
        }
    }

    // obj: function, takes an array as argument and return the objective value.
    setObjective(obj) {
        this.obj = obj;
    }

    // get the objective value at current location
    calculate(data, gen) {
        if (data.length != this.dim) {
            throw new Error('number of decision variable should fit the problem dimension!');
        }
        if (this.obj === undefined) {
            throw new Error('Please set up the objective function first!');
        }
        let punish = 0;
        this.constraints.forEach((item) => {
            punish += Math.pow(item(data), this.penalty[2]);
        });
        return this.obj(data) * this.type - Math.pow(this.penalty[0] * gen, this.penalty[1]) * punish;
    }

    // if current location violates the boundary
    // use re-entering strategy to make it right.
    boundaryCheck(data) {
        for (let i = 0; i < data.length; i++) {
            if (data[i] < this.lower[i]) {
                data[i] = this.upper[i] + (data[i] - this.lower[i]);
            }
            else if (data[i] > this.upper[i]) {
                data[i] = this.lower[i] + (data[i] - this.upper[i]);
            }
        }
    }

    // con: function, takes decision variables
    addConstraint(con) {
        this.constraints.push(con);
    }

    // initialize a location based on boundary
    initLoc() {
        let temp = [];
        for (let i = 0; i < this.lower.length; i++) {
            temp.push(myRand(this.lower[i], this.upper[i]));
        }
        return temp;
    }

    // initialize the velocity based on vmax.
    initVel() {
        let temp = [];
        for (let i = 0; i < this.vmax.length; i++) {
            temp.push(Math.random() * this.vmax[i]);
        }
        return temp;
    }

    // check if current velocity violates the vmax.
    velocityCheck(vel) {
        for (let i = 0; i < this.vmax.length; i++) {
            if (Math.abs(vel[i]) > this.vmax[i]) {
                vel[i] = vel[i] > 0 ? this.vmax[i] : -this.vmax[i];
            }
        }
    }
}

class Swarm {
    constructor(config) {
        this.config = config;
        // prepare data for plotting
        this.chartData = [
            ['Generation', 'Best Fitness']
        ];
        this.initialize();
        this.w = this.config.coeff[0];
        this.c1 = this.config.coeff[1];
        this.c2 = this.config.coeff[2];


        // console.log(this.config.coeff);
    }

    initialize() {
        // array of locations
        this.particles = [];
        // array of velocities.
        this.velocity = [];
        // array of fitness
        this.fitness = [];
        // array of pbest
        this.pbest = [];
        // array of pbest location
        this.pbestLoc = [];
        // gbest
        this.gbest = null;
        // gbest location
        this.gbestLoc = null;
        // record the best generation
        this.bestGen = 0;
        // initialize locations
        for (let i = 0; i < this.config.number; i++) {
            this.particles.push(this.config.initLoc());
            this.pbestLoc.push(this.particles[i].slice());
        }
        // initialize velocities
        for (let i = 0; i < this.config.number; i++) {
            this.velocity.push(this.config.initVel());
        }
        // initialize fitness and pbest.
        for (let i = 0; i < this.particles.length; i++) {
            this.fitness.push(this.config.calculate(this.particles[i], 0));
            this.pbest.push(this.fitness[i]);
        }
        // initialize gbest.
        let max = 0;
        for (let i = 1; i < this.pbest.length; i++) {
            if (this.pbest[i] > this.pbest[max]) {
                max = i;
            }
        }
        this.gbest = this.pbest[max];
        this.gbestLoc = this.pbestLoc[max].slice();
        this.chartData.push([
            0, this.gbest
        ]);
    }

    search(cycle) {
        for (let i = 1; i <= cycle; i++) {
            for (let j = 0; j < this.particles.length; j++) {
                this.update(j, i);
                if (this.fitness[j] > this.pbest[j]) {
                    this.pbest[j] = this.fitness[j];
                    this.pbestLoc[j] = this.particles[j].slice();
                }
            }
            // update gbest
            let max = 0;
            for (let j = 1; j < this.pbest.length; j++) {
                if (this.pbest[j] > this.pbest[max]) {
                    max = j;
                }
            }
            if (this.pbest[max] > this.gbest) {
                this.gbest = this.pbest[max];
                this.gbestLoc = this.pbestLoc[max].slice();
                this.bestGen = i;
            }
            this.chartData.push([
                i, this.gbest
            ]);
        }
    }

    // update velocity, location and fitness.
    update(index, gen) {
        let vel = this.velocity[index];
        let ploc = this.pbestLoc[index];
        let now = this.particles[index];
        // update velocities for every dimension
        for (let i = 0; i < vel.length; i++) {
            vel[i] = this.w * vel[i] +
                    Math.random() * this.c1 * (ploc[i] - now[i]) +
                    Math.random() * this.c2 * (this.gbestLoc[i] - now[i]);
        }

        // check if velocities is too big.
        this.config.velocityCheck(vel);
        // update current location
        for (let i = 0; i < now.length; i++) {
            now[i] = now[i] + vel[i];
        }
        this.config.boundaryCheck(now);
        // update fitness
        this.fitness[index] = this.config.calculate(now, gen);
    }

    show() {
        console.log(`Best location: ${this.gbestLoc}`);
        console.log(`Optimal Solution: ${this.gbest}`);
        console.log(`Best Generation: ${this.bestGen}`);
    }
}
